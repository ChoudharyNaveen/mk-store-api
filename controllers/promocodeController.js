const { Promocode: PromocodeService } = require('../services')

const savePromocode = async (req, res) => {
  try {
    const data = req.validatedData

    const { errors: err, doc } = await PromocodeService.savePromocode(data)
    if (doc) {
      return res.postSuccessfully({ message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updatePromocode = async (req, res) => {
  try {
    const data = req.validatedData

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await PromocodeService.updatePromocode(data)

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

const getPromocode = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await PromocodeService.getPromocode(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  savePromocode,
  updatePromocode,
  getPromocode,
}
