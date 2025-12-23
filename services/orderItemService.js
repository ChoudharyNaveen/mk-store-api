const {
  orderItem: OrderItemModel,
  order: OrderModel,
  product: ProductModel,
  user: UserModel,
  address: AddressModel,
  sequelize,
} = require('../database')
const Helper = require('../utils/helper')

const getOrderItem = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await OrderItemModel.findAndCountAll({
    where: { ...where },
    include: [
      {
        model: UserModel,
        as: 'user',
      },
      {
        model: OrderModel,
        as: 'order',
        include: [{ model: AddressModel, as: 'address' }],
      },
      {
        model: ProductModel,
        as: 'product',
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

module.exports = {
  getOrderItem,
}
