const { Product: ProductService } = require('../services')
const { handleServerError } = require('../utils/helper')

const saveProduct = async (req, res) => {
  try {
    const data = req.validatedData
    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const { errors: err, doc } = await ProductService.saveProduct({
      data,
      imageFile,
    })
    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const updateProduct = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id }
    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await ProductService.updateProduct({ data, imageFile })

    if (concurrencyError) {
      return res.status(409).json({ success: false, message: 'Concurrency error' })
    }
    if (doc) {
      const { concurrencyStamp: stamp } = doc
      res.setHeader('x-concurrencystamp', stamp)
      res.setHeader('message', 'successfully updated.')

      return res.status(200).json({ success: true, message: 'successfully updated' })
    }

    return res.status(400).json(err)
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const getProduct = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await ProductService.getProduct(data)

    return res.status(200).json({ success: true, doc, count })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const getProductsGroupedByCategory = async (req, res) => {
  try {
    const data = req.validatedData

    const { doc } = await ProductService.getProductsGroupedByCategory(data)

    return res.status(200).json({ success: true, doc })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.validatedData

    const { errors, doc } = await ProductService.deleteProduct(productId)
    if (doc) {
      res.setHeader('message', 'successfully deleted')
      return res.status(200).json({ success: true, message: 'successfully deleted' })
    }
    return res.status(400).json(errors)
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

module.exports = {
  saveProduct,
  updateProduct,
  getProduct,
  getProductsGroupedByCategory,
  deleteProduct
}
