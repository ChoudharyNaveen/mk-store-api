const { Branch: BranchService } = require('../services')

const saveBranch = async (req, res) => {
  try {
    const data = req.validatedData

    const { errors: err, doc } = await BranchService.saveBranch({ data })
    if (doc) {
      return res.postSuccessfully({ message: 'successfully added' })
    }
    return res.status(400).json(err)
  } catch (error) {
    console.log(error)
    return res.serverError(error)
  }
}

const updateBranch = async (req, res) => {
  try {
    const data = req.validatedData

    const {
      errors: err,
      concurrencyError,
      doc,
    } = await BranchService.updateBranch({ data })

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

const getBranch = async (req, res) => {
  try {
    const data = req.validatedData

    const { count, doc } = await BranchService.getBranch(data)

    return res.getRequest({ doc, count })
  } catch (error) {
    return res.serverError(error)
  }
}

module.exports = {
  saveBranch,
  updateBranch,
  getBranch,
}
