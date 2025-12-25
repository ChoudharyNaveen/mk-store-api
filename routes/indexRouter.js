module.exports = (router) => {
  /**
   * @swagger
   * /api/test:
   *   get:
   *     summary: Test endpoint
   *     tags: [Test]
   *     description: Simple test endpoint to verify API is working
   *     responses:
   *       200:
   *         description: Welcome message
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *               example: "Welcome to mk store backend"
   */
  router.get('/', function (req, res, next) {
    res.send('Welcome to mk store backend')
  })
}
