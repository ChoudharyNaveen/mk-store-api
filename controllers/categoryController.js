const { Category: CategoryService } = require('../services')
const { handleServerError } = require('../utils/helper')

const saveCategory = async (req, res) => {
  try {
    const data = req.validatedData
    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const { errors: err, doc } = await CategoryService.saveCategory({
      data,
      imageFile,
    })
    if (doc) {
      return res.status(201).json({ success: true, message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return handleServerError(error, req, res)
  }
}

const updateCategory = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id }
    const imageFile = req.files['file'] ? req.files['file'][0] : null

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await CategoryService.updateCategory({ data, imageFile })

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
    console.log(error)
    return handleServerError(error, req, res)
  }
}

const getCategory = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await CategoryService.getCategory(data)

    return res.status(200).json({ success: true, doc, count })
  } catch (error) {
    return handleServerError(error, req, res)
  }
}

module.exports = {
  saveCategory,
  updateCategory,
  getCategory,
}
