const {
  orderItem: OrderItemModel,
  order: OrderModel,
  product: ProductModel,
  user: UserModel,
  address: AddressModel,
} = require('../database');
const {
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
} = require('../utils/helper');

const getOrderItem = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await OrderItemModel.findAndCountAll({
    where: { ...where },
    attributes: [ 'id', 'order_id', 'product_id', 'quantity', 'price_at_purchase', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
    include: [
      {
        model: UserModel,
        as: 'user',
        attributes: [ 'id', 'name', 'email', 'mobile_number' ],
      },
      {
        model: OrderModel,
        as: 'order',
        attributes: [ 'id', 'total_amount', 'status', 'payment_status', 'address_id' ],
        include: [ {
          model: AddressModel,
          as: 'address',
          attributes: [ 'id', 'house_no', 'street_details', 'landmark', 'name', 'mobile_number' ],
        } ],
      },
      {
        model: ProductModel,
        as: 'product',
        attributes: [ 'id', 'title', 'selling_price', 'image' ],
      },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });
  const doc = [];

  if (response) {
    const { count, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, doc };
  }

  return { count: 0, doc: [] };
};

module.exports = {
  getOrderItem,
};
