const { v4: uuidV4 } = require('uuid');
const cron = require('node-cron');
const { Op } = require('sequelize');
const { offer: OfferModel, sequelize } = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');

const saveOffer = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const { createdBy, ...datas } = data;

    transaction = await sequelize.transaction();
    const concurrencyStamp = uuidV4();

    let imageUrl = null;

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      image: 'NA',
    };

    const cat = await OfferModel.create(convertCamelToSnake(doc), {
      transaction,
    });

    if (imageFile) {
      const filename = `offer-${cat.id}-${Date.now()}.jpg`;
      const vendorId = datas.vendorId || datas.vendor_id;
      const branchId = datas.branchId || datas.branch_id;

      imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);
      await OfferModel.update({ image: imageUrl }, {
        where: { id: cat.id },
        transaction,
      });
    }
    await transaction.commit();

    return { doc: { cat } };
  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'failed to save course offer' } };
  }
};

const updateOffer = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await OfferModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp', 'vendor_id', 'branch_id' ],
    transaction,
  });

  if (!response) {
    return { errors: { message: 'Offer not found' } };
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    return { concurrencyError: { message: 'invalid concurrency stamp' } };
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(data),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  if (imageFile) {
    const filename = `offer-${id}-${Date.now()}.jpg`;
    const vendorId = response.vendor_id;
    const branchId = response.branch_id;

    const imageUrl = await uploadFile(imageFile, filename, vendorId, branchId);

    doc.image = imageUrl;
  }

  await OfferModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => {
  console.log(error);

  return { errors: { message: 'transaction failed' } };
});

const getOffer = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    OfferModel,
    {
      where: { ...where, status: 'ACTIVE' },
      order,
      limit,
      offset,
    },
    pageNumber,
  );
  let doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    const dataValues = rows.map((element) => element.dataValues);

    // Convert image URLs to CloudFront URLs (automatically handles nested objects/arrays)
    doc = convertImageFieldsToCloudFront(JSON.parse(JSON.stringify(dataValues)));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

async function cronJobForUpdatingOfferStatus() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const today = new Date();

      await OfferModel.update(
        { status: 'ACTIVE' },
        {
          where: {
            start_date: { [Op.lte]: today },
            end_date: { [Op.gte]: today },
            status: 'OPEN',
          },
        },
      );

      await OfferModel.update(
        { status: 'INACTIVE' },
        {
          where: {
            [Op.or]: [
              { start_date: { [Op.gt]: today } },
              { end_date: { [Op.lt]: today } },
            ],
            status: 'ACTIVE',
          },
        },
      );

      console.log(
        `[Offer Scheduler] Offer statuses updated on ${today.toISOString()}`,
      );
    } catch (error) {
      console.error('[Offer Cron] Error updating offers:', error);
    }
  });
}

module.exports = {
  saveOffer,
  updateOffer,
  getOffer,
  cronJobForUpdatingOfferStatus,
};
