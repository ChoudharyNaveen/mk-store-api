const {
  wishlist: WishlistModel,
  product: ProductModel,
  sequelize,
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')

const saveWishlist = async (data) => {
  let transaction = null
  try {
    const { createdBy,productId, ...datas } = data
    transaction = await sequelize.transaction()
    const concurrencyStamp = uuidV4()

    const isExists = await WishlistModel.findOne({
      where: {product_id: productId}
    })

    if (isExists) {
      return {isexists: isExists}
    }

    const doc = {
      ...datas,
      productId,
      concurrencyStamp,
      createdBy,
    }
    const cat = await WishlistModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { cat } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save wishlist' } }
  }
}

const getWishlist = async (payload) => {
  const { pageSize, pageNumber, filters, sorting, createdBy } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await WishlistModel.findAndCountAll({
    where: { ...where, created_by: createdBy },
    include: [
      {
        model: ProductModel,
        as: 'productDetails',
      },
    ],
    order,
    limit,
    offset,
  })
  const doc = []
  if (response) {
    const { count, rows } = response
    rows.map((element) => doc.push(element.dataValues))
    return { count, doc }
  }
  return { count: 0, doc: [] }
}

const deleteWishlist = async (wishlistId) => {
  try {
    const del = await WishlistModel.destroy({
      where: { id: wishlistId },
    })
    return { doc: { message: 'successfully deleted wishlist' } }
  } catch (error) {
    console.log(error)
    return { errors: { message: 'failed to delete wishlist' } }
  }
}

module.exports = {
  saveWishlist,
  getWishlist,
  deleteWishlist
}
