const { Product: ProductService } = require('../services')

const saveProduct = async (req, res) => {
  try {
    const data = req.validatedData
    const imageFile = req.files['file'] ? req.files['file'][0] : null

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
    const data = req.validatedData
    const imageFile = req.files['file'] ? req.files['file'][0] : null

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
    const data = req.validatedData

    const { count, doc } = await ProductService.getProduct(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const getProductsGroupedByCategory = async (req, res) => {
  try {
    const data = req.validatedData

    const { doc } = await ProductService.getProductsGroupedByCategory(data)

    return res.getRequest(doc)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.validatedData

    const { errors, doc } = await ProductService.deleteProduct(productId)
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
