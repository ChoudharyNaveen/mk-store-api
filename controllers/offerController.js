const { Offer: OfferService } = require('../services')
const {
  getOffer: getOfferSchema,
} = require('../schemas')
const Validator = require('../utils/validator')

const saveOffer = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const imageFile = req.files['file'] ? req.files['file'][0] : null
    const data = { ...body, createdBy }

    const { errors: err, doc } = await OfferService.saveOffer({
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

const updateOffer = async (req, res) => {
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
    } = await OfferService.updateOffer({ data, imageFile })

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

const getOffer = async (req, res) => {
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
      schema: getOfferSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await OfferService.getOffer(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveOffer,
  updateOffer,
  getOffer,
}
