const { Category: CategoryService } = require('../services')
const {
  getCategory: getCategorySchema,
  saveCategory: saveCategorySchema,
  updateCategory: updateCategorySchema,
} = require('../schemas')
const Validator = require('../utils/validator')

const saveCategory = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const imageFile = req.files['file'] ? req.files['file'][0] : null
    const data = { ...body, createdBy }

    const { errors } = Validator.isSchemaValid({
      data,
      schema: saveCategorySchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { errors: err, doc } = await CategoryService.saveCategory({
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

const updateCategory = async (req, res) => {
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
      schema: updateCategorySchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await CategoryService.updateCategory({ data, imageFile })

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

const getCategory = async (req, res) => {
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
      schema: getCategorySchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await CategoryService.getCategory(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveCategory,
  updateCategory,
  getCategory,
}
