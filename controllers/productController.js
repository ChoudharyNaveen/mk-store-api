const { Product: ProductService } = require('../services')
const {
  getProduct: getProductSchema,
  saveProduct: saveProductSchema,
  updateProduct: updateProductSchema,
  deleteProduct: deleteProductSchema,
  getProductsGroupedByCategory: getProductsGroupedByCategorySchema,
} = require('../schemas')
const Validator = require('../utils/validator')

const saveProduct = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const imageFile = req.files['file'] ? req.files['file'][0] : null
    const data = { ...body, createdBy }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: saveProductSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc } = await ProductService.saveProduct({
      data,
      imageFile,
    })
    if (doc) {
      return res.postSuccessfully({ message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updateProduct = async (req, res) => {
  try {
    const {
      body,
      params: { publicId },
      user: { publicId: updatedBy },
      headers: { 'x-concurrencystamp': concurrencyStamp },
    } = req

    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const data = {
      ...body,
      publicId,
      concurrencyStamp,
      updatedBy,
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: updateProductSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await ProductService.updateProduct({ data, imageFile })

    if (concurrencyError) {
      return res.concurrencyError()
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc
      res.setHeader('x-concurrencystamp', stamp)
      res.setHeader('message', 'successfully updated.')

      return res.updated()
    }

    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const getProduct = async (req, res) => {
  try {
    const {
      query: {
        pageSize: pageSizeString,
        pageNumber: pageNumberString,
        ...query
      },
    } = req

    const pageNumber = parseInt(pageNumberString || 1)
    const pageSize = parseInt(pageSizeString || 10)

    const data = {
      ...query,
      pageNumber,
      pageSize,
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: getProductSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await ProductService.getProduct(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const getProductsGroupedByCategory = async (req, res) => {
  try {
    const {
      query: {
        pageSize: pageSizeString,
        pageNumber: pageNumberString,
        ...query
      },
    } = req

    const pageNumber = parseInt(pageNumberString || 1)
    const pageSize = parseInt(pageSizeString || 10)

    const data = {
      ...query,
      pageNumber,
      pageSize,
    }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: getProductsGroupedByCategorySchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { doc } = await ProductService.getProductsGroupedByCategory(data)

    return res.getRequest( doc )
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.query

    const data = { productId }

    const { errors: validationErrors } = Validator.isSchemaValid({
      data,
      schema: deleteProductSchema,
    })

    if (validationErrors) {
      return res.badRequest('field-validation', validationErrors)
    }

    const { errors, doc } = await ProductService.deleteProduct(
      productId
    )
    if (doc) {
      res.setHeader('message', 'successfully deleted')
      return res.deleted()
    }
    return res.status(400).json(errors)
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  deleteProduct
}
