const express = require('express')
// const multer = require('multer')
const busboy = require('busboy')
const path = require('path')

const fs = require('fs')
const fsPromises = require('fs').promises

const { getUniqFilename, removeDir } = require('./utils')

const UPLOAD_DIR = path.join(__dirname, 'uploads')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const router = express.Router()

router.get('/getUploadedChunks', (req, res) => {
  const { filename } = req.query
  const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
  let uploadedChunks = []

  // 如果目录存在，则读取目录下的所有文件
  if (fs.existsSync(chunkDir)) {
    // 读取目录下的所有文件，并返回文件名的索引
    uploadedChunks = fs.readdirSync(chunkDir).map(name => parseInt(name.split('_')[1]))
  }

  res.json(uploadedChunks)
})

router.post('/upload', (req, res) => {
  const bb = busboy({
    headers: req.headers,
  })
  let chunkIndex, chunkHash, filename, writeStream

  req.on('aborted', () => {
    const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`)
    writeStream.end()
    fsPromises.unlink(chunkPath)
  })

  bb.on('field', (fieldname, value) => {
    if (fieldname === 'chunkIndex') chunkIndex = value
    if (fieldname === 'chunkHash') chunkHash = value
    if (fieldname === 'filename') filename = value
    if (fieldname === 'fileBlob' && value === 'undefined') {
      res.status(400).json({
        msg: '文件切片数据不存在',
      })
    }
  })
  // 如果请求被中止，则删除正在写的分片

  bb.on('file', (fieldname, file) => {
    const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
    fs.mkdir(
      chunkDir,
      {
        // 如果目录不存在，则创建目录【递归创建】
        recursive: true,
      },
      err => {
        if (err) {
          return res.status(500).json({
            msg: '无法创建文件夹',
            error: err.message,
          })
        }

        const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`)
        writeStream = fs.createWriteStream(chunkPath)

        file.pipe(writeStream)
        writeStream.on('close', () => {
          res.sendStatus(200)
        })

        writeStream.on('error', () => {
          res.status(500).json({
            msg: '保存文件失败',
            error: err.message,
          })
        })
      }
    )
  })

  // 将请求体中的数据传递给busboy
  req.pipe(bb)
})

router.post('/merge', async (req, res) => {
  console.log(123)
  const { filename } = req.body

  if (!filename) {
    return res.status(400).json({
      msg: '文件名不能为空',
    })
  }

  const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
  console.log(chunkDir, 'chunkDir')
  if (!fs.existsSync(chunkDir)) {
    console.log(456)
    return res.status(400).json({
      msg: '要合并的文件不存在xxxx',
    })
  }
  const indexs = fs.readdirSync(chunkDir).map(name => parseInt(name.split('_')[1]))
  const indexSort = indexs.sort((a, b) => a - b)
  const unqieFilename = getUniqFilename(UPLOAD_DIR, filename)
  const writeStream = fs.createWriteStream(path.join(UPLOAD_DIR, unqieFilename))

  for (let index = 0; index < indexSort.length; index++) {
    const chunkPath = path.join(chunkDir, `chunk_${index}`)
    const chunk = fs.readFileSync(chunkPath)
    writeStream.write(chunk)
  }

  writeStream.end()
  // fs.rmdirSync(chunkDir)

  await removeDir(chunkDir)
  res.sendStatus(200)
})

module.exports = router
