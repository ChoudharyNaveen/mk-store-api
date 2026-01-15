const {
  orderItem: OrderItemModel,
  order: OrderModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  user: UserModel,
  address: AddressModel,
} = require('../database');
const {
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
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

  const response = await findAndCountAllWithTotal(
    OrderItemModel,
    {
      where: { ...where },
      attributes: [ 'id', 'order_id', 'product_id', 'variant_id', 'variant_name', 'quantity', 'price_at_purchase', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
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
            attributes: [ 'id', 'address_line_1', 'street', 'landmark', 'name', 'mobile_number', 'phone', 'email' ],
          } ],
        },
        {
          model: ProductModel,
          as: 'product',
          attributes: [ 'id', 'title', 'selling_price', 'image' ],
          required: false,
        },
        {
          model: ProductVariantModel,
          as: 'variant',
          attributes: [ 'id', 'variant_name', 'variant_type', 'selling_price' ],
          required: false,
          include: [
            {
              model: ProductModel,
              as: 'product',
              attributes: [ 'id', 'title', 'image' ],
            },
          ],
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    },
  );
  const doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

module.exports = {
  getOrderItem,
};
