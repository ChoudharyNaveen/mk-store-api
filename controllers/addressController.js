const { Address: AddressService } = require('../services')

const saveAddress = async (req, res) => {
  try {
    const data = req.validatedData

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
    const data = { ...req.validatedData, id: req.params.id }

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await AddressService.updateAddress(data)

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
    const data = req.validatedData

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
