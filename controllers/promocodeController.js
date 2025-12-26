const { Promocode: PromocodeService } = require('../services');
const { handleServerError } = require('../utils/helper');

const savePromocode = async (req, res) => {
  try {
    const data = req.validatedData;

    const { errors: err, doc } = await PromocodeService.savePromocode(data);

    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' });
    }

    return res.status(400).json(err);
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const updatePromocode = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id };

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await PromocodeService.updatePromocode(data);

    if (concurrencyError) {
      return res.status(409).json({ success: false, message: 'Concurrency error' });
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc;

      res.setHeader('x-concurrencystamp', stamp);
      res.setHeader('message', 'successfully updated.');

      return res.status(200).json({ success: true, message: 'successfully updated' });
    }

    return res.status(400).json(err);
  } catch (error) {
    console.log(error);

    return handleServerError(error, req, res);
  }
};

const getPromocode = async (req, res) => {
  try {
    const data = req.validatedData;

    const { count, doc } = await PromocodeService.getPromocode(data);

    return res.status(200).json({ success: true, doc, count });
  } catch (error) {
    return handleServerError(error, req, res);
  }
};

module.exports = {
  savePromocode,
  updatePromocode,
  getPromocode,
};
