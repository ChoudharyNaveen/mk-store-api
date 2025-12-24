const {
  product: ProductModel,
  category: CategoryModel,
  subCategory: SubCategoryModel,
  cart: CartModel,
  orderItem: OrderItemModel,
  wishlist: WishlistModel,
  branch: BranchModel,
  sequelize,
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')
const { uploadFile } = require('../config/azure')

const saveProduct = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { createdBy, branchId, ...datas } = data
    transaction = await sequelize.transaction()

    // Verify branch exists and get vendor_id
    if (branchId) {
      const branch = await BranchModel.findOne({
        where: { public_id: branchId },
      })

      if (!branch) {
        await transaction.rollback()
        return { errors: { message: 'Branch not found' } }
      }

      // Set vendor_id from branch
      datas.vendorId = branch.vendor_id
      datas.branchId = branchId
    }

    const publicId = uuidV4()
    const concurrencyStamp = uuidV4()

    let imageUrl = null

    const doc = {
      ...datas,
      publicId,
      concurrencyStamp,
      createdBy,
    }

    if (imageFile) {
      const blobName = `product-${publicId}-${Date.now()}.jpg`
      imageUrl = await uploadFile(imageFile, blobName)
    }
    doc.image = imageUrl
    const cat = await ProductModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { cat } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save product' } }
  }
}

const updateProduct = async ({ data, imageFile }) => {
  let transaction = null
  const { publicId, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await ProductModel.findOne({
      where: { public_id: publicId },
    })

    if (response) {
      const { concurrency_stamp: stamp } = response
      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4()
        const doc = {
          ...Helper.convertCamelToSnake(data),
          updatedBy,
          concurrency_stamp: newConcurrencyStamp,
        }
        if (imageFile) {
          const blobName = `product-${publicId}-${Date.now()}.jpg`
          const imageUrl = await uploadFile(imageFile, blobName)
          doc.image = imageUrl
        }
        await ProductModel.update(doc, {
          where: { public_id: publicId },
          transaction,
        })
        await transaction.commit()
        return { doc: { concurrencyStamp: newConcurrencyStamp } }
      }
      await transaction.rollback()
      return { concurrencyError: { message: 'invalid concurrency stamp' } }
    }
    return {}
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'transaction failed' } }
  }
}

const getProduct = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await ProductModel.findAndCountAll({
    where: { ...where },
    include: [
      {
        model: CategoryModel,
        as: 'category',
      },
      {
        model: SubCategoryModel,
        as: 'subCategory',
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

const getProductsGroupedByCategory = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const allFilters = filters || []
  const productFilters = allFilters.filter((f) =>
    (f.key || '').startsWith('products.')
  )
  const categoryFilters = allFilters.filter(
    (f) => !f.key || !f.key.startsWith('products.')
  )

  const productWhere = Helper.generateWhereCondition(productFilters)

  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await CategoryModel.findAndCountAll({
    where: { status: 'ACTIVE' },
    include: [
      {
        model: ProductModel,
        as: 'products',
        where: { ...productWhere, status: 'ACTIVE' },
        required: false,
      },
    ],
    distinct: true,
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

const deleteProduct = async (productId) => {
  try {
    const cart = await CartModel.destroy({
      where: { product_id: productId },
    })
    const orderItem = await OrderItemModel.destroy({
      where: { product_id: productId },
    })
    const wishlist = await WishlistModel.destroy({
      where: { product_id: productId },
    })
    const del = await ProductModel.destroy({
      where: { public_id: productId },
    })
    return { doc: { message: 'successfully deleted product' } }
  } catch (error) {
    console.log(error)
    return { errors: { message: 'failed to delete product' } }
  }
}

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  deleteProduct,
}
