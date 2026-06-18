export function useQRCode() {
  function generateQRCodeSVG(text, size = 128) {
    const qrData = encodeQRData(text)
    const moduleCount = qrData.length
    const moduleSize = size / moduleCount
    
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    svgContent += `<rect width="${size}" height="${size}" fill="#ffffff"/>`
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qrData[row][col]) {
          const x = col * moduleSize
          const y = row * moduleSize
          svgContent += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="#1a2c52"/>`
        }
      }
    }
    
    svgContent += '</svg>'
    return svgContent
  }
  
  function encodeQRData(text) {
    const version = 3
    const size = version * 4 + 17
    const matrix = Array(size).fill(null).map(() => Array(size).fill(false))
    
    addPositionPatterns(matrix, size)
    addTimingPatterns(matrix, size)
    addAlignmentPatterns(matrix, version)
    
    const dataBits = textToBinary(text)
    const paddedBits = padData(dataBits, version)
    
    placeData(matrix, paddedBits, size)
    applyMask(matrix, size)
    addFormatInformation(matrix, size)
    
    return matrix
  }
  
  function addPositionPatterns(matrix, size) {
    const positions = [[0, 0], [size - 7, 0], [0, size - 7]]
    
    for (const [row, col] of positions) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
          matrix[row + r][col + c] = isOuter || isInner
        }
      }
    }
    
    for (let i = 0; i < 8; i++) {
      matrix[7][i] = false
      matrix[i][7] = false
      matrix[size - 8][i] = false
      matrix[i][size - 8] = false
      matrix[7][size - 1 - i] = false
      matrix[size - 1 - i][7] = false
    }
  }
  
  function addTimingPatterns(matrix, size) {
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0
      matrix[i][6] = i % 2 === 0
    }
  }
  
  function addAlignmentPatterns(matrix, version) {
    const positions = getAlignmentPatternPositions(version)
    for (const row of positions) {
      for (const col of positions) {
        if (matrix[row][col]) continue
        if ((row === 6 && col === 6) || 
            (row === 6 && col === matrix.length - 7) ||
            (row === matrix.length - 7 && col === 6)) continue
        
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2
            const isCenter = r === 0 && c === 0
            matrix[row + r][col + c] = isOuter || isCenter
          }
        }
      }
    }
  }
  
  function getAlignmentPatternPositions(version) {
    if (version === 1) return []
    if (version === 2) return [6, 18]
    if (version === 3) return [6, 22]
    return [6]
  }
  
  function textToBinary(text) {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    let bits = ''
    
    bits += '0100'
    
    const lengthBits = bytes.length.toString(2).padStart(8, '0')
    bits += lengthBits
    
    for (const byte of bytes) {
      bits += byte.toString(2).padStart(8, '0')
    }
    
    bits += '0000'
    
    return bits
  }
  
  function padData(bits, version) {
    const totalDataBits = 15 * 8
    
    while (bits.length < totalDataBits) {
      bits += '11101100'
      if (bits.length >= totalDataBits) break
      bits += '00010001'
    }
    
    return bits.substring(0, totalDataBits)
  }
  
  function placeData(matrix, bits, size) {
    let bitIndex = 0
    let row = size - 1
    let col = size - 1
    let directionUp = true
    
    while (col > 0) {
      if (col === 6) col--
      
      const currentRow = directionUp ? row : size - 1 - row
      
      if (!isFunctionModule(currentRow, col, size)) {
        matrix[currentRow][col] = bits[bitIndex] === '1'
        bitIndex++
        if (bitIndex >= bits.length) return
      }
      
      if (!isFunctionModule(currentRow, col - 1, size)) {
        matrix[currentRow][col - 1] = bits[bitIndex] === '1'
        bitIndex++
        if (bitIndex >= bits.length) return
      }
      
      if (directionUp) {
        row--
        if (row < 0) {
          row = 0
          directionUp = false
          col -= 2
        }
      } else {
        row++
        if (row >= size) {
          row = size - 1
          directionUp = true
          col -= 2
        }
      }
    }
  }
  
  function isFunctionModule(row, col, size) {
    if (row < 7 && col < 7) return true
    if (row < 7 && col >= size - 7) return true
    if (row >= size - 7 && col < 7) return true
    if (row === 6 || col === 6) return true
    return false
  }
  
  function applyMask(matrix, size) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (isFunctionModule(row, col, size)) continue
        if ((row + col) % 2 === 0) {
          matrix[row][col] = !matrix[row][col]
        }
      }
    }
  }
  
  function addFormatInformation(matrix, size) {
    const formatData = '111011111000100'
    
    for (let i = 0; i < 15; i++) {
      const bit = formatData[i] === '1'
      
      if (i < 6) {
        matrix[8][i] = bit
        matrix[i][8] = bit
      } else if (i === 6) {
        matrix[8][7] = bit
        matrix[7][8] = bit
      } else if (i === 7) {
        matrix[8][8] = bit
        matrix[size - 8][8] = bit
      } else if (i < 15) {
        matrix[size - 15 + i][8] = bit
        matrix[8][size - 15 + i] = bit
      }
    }
    
    matrix[size - 8][8] = true
  }
  
  function svgToDataUrl(svg) {
    const encoded = encodeURIComponent(svg)
    return `data:image/svg+xml;charset=utf-8,${encoded}`
  }
  
  function generateQRCodeDataUrl(text, size = 128) {
    const svg = generateQRCodeSVG(text, size)
    return svgToDataUrl(svg)
  }
  
  return {
    generateQRCodeSVG,
    generateQRCodeDataUrl
  }
}
