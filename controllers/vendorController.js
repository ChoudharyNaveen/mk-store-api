const { Vendor: VendorService } = require('../services')

const saveVendor = async (req, res) => {
  try {
    const data = req.validatedData

    const { errors: err, doc } = await VendorService.saveVendor({ data })
    if (doc) {
      return res.postSuccessfully({ message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updateVendor = async (req, res) => {
  try {
    const data = { ...req.validatedData, id: req.params.id }

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await VendorService.updateVendor({ data })

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

const getVendor = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await VendorService.getVendor(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

const getVendorByCode = async (req, res) => {
  try {
    const { code } = req.validatedData

    const { errors: err, doc } = await VendorService.getVendorByCode(code)

    if (err) {
      return res.status(404).json(err)
    }

    return res.getRequest({ doc })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveVendor,
  updateVendor,
  getVendor,
  getVendorByCode,
}
