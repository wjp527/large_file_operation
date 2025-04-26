const express = require('express')
const cors = require('cors')
// const multer = require('multer')

const app = express()

// 启用CORS
app.use(cors())

// 设置静态资源目录
app.use(express.static(__dirname))

// 处理json请求
app.use(express.json())

app.get('/', (req, res) => {
  res.redirect('/index.html')
})

const fileRouters = require('./file.js')
app.use('/file', fileRouters)

const listener = app.listen(3000, () => {
  console.log('server is running on port 3000')
})
