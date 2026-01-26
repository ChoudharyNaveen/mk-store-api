const {
  orderItem: OrderItemModel,
  order: OrderModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  productImage: ProductImageModel,
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
      attributes: [ 'id', 'order_id', 'product_id', 'variant_id', 'variant_name', 'quantity', 'price_at_purchase', 'is_combo', 'subtotal', 'discount_amount', 'created_by', 'created_at', 'updated_at', 'concurrency_stamp' ],
      include: [
        {
          model: OrderModel,
          as: 'order',
          attributes: [ 'id', 'total_amount', 'status', 'payment_status', 'order_number' ],
        },
        {
          model: ProductModel,
          as: 'product',
          attributes: [ 'id', 'title' ],
          required: false,
          include: [
            {
              model: ProductImageModel,
              as: 'images',
              where: { status: 'ACTIVE', is_default: 1 },
              required: false,
              attributes: [ 'id', 'image_url', 'is_default', 'display_order' ],
              limit: 1,
            },
          ],
        },
        {
          model: ProductVariantModel,
          as: 'variant',
          attributes: [ 'id', 'variant_name', 'selling_price' ],
          required: false,
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
