const { Address: AddressService } = require('../services')
const { getAddress: getAddressSchema } = require('../schemas')
const Validator = require('../utils/validator')

const saveAddress = async (req, res) => {
  try {
    const {
      body,
      user: { publicId: createdBy },
    } = req

    const data = { ...body, createdBy }

    const { errors: err, doc } = await AddressService.saveAddress(data)
    if (doc) {
      return res.postSuccessfully({ message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updateAddress = async (req, res) => {
  try {
    const {
      body,
      params: { publicId },
      user: { publicId: updatedBy },
      headers: { 'x-concurrencystamp': concurrencyStamp },
    } = req

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
    } = await AddressService.updateAddress( data)

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

const getAddress = async (req, res) => {
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
      schema: getAddressSchema,
    })

    if (errors) {
      return res.badRequest('field-validation', errors)
    }

    const { count, doc } = await AddressService.getAddress(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveAddress,
  updateAddress,
  getAddress,
}
