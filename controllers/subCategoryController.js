const { SubCategory: SubCategoryService } = require('../services')
const { getSubCategory: getSubCategorySchema } = require('../schemas')
const Validator = require('../utils/validator')

const saveSubCategory = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const imageFile = req.files['file'] ? req.files['file'][0] : null
    const data = { ...body, createdBy }

    const { errors: err, doc } = await SubCategoryService.saveSubCategory({
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

const updateSubCategory = async (req, res) => {
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

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await SubCategoryService.updateSubCategory({ data, imageFile })

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

const getSubCategory = async (req, res) => {
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
      schema: getSubCategorySchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await SubCategoryService.getSubCategory(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveSubCategory,
  updateSubCategory,
  getSubCategory,
}
