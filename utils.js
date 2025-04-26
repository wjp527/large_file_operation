const path = require('path')
const fs = require('fs')
const fsPromises = require('fs').promises

function getUniqFilename(dir, filename) {
  // 获取文件扩展名
  let ext = path.extname(filename)

  let basename = path.basename(filename, ext)

  let newFilename = filename

  let counter = 1

  while (fs.existsSync(path.join(dir, newFilename))) {
    newFilename = `${basename}(${counter})${ext}`
    counter++
  }

  return newFilename
}

async function removeDir(dir) {
  try {
    const files = await fsPromises.readdir(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      // const stat = await fsPromises.Istat(filePath)
      const stat = await fsPromises.stat(filePath)

      if (stat.isDirectory()) {
        await removeDir(filePath)
      } else {
        await fsPromises.unlink(filePath)
      }
    }
    await fsPromises.rmdir(dir)
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  getUniqFilename,
  removeDir,
}
