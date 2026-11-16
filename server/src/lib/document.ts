
import cvModule from '@techstark/opencv-js'
import sharp from 'sharp'

let cvInstance: any

async function getOpenCV() {
  if (!cvInstance) {
    cvInstance = cvModule instanceof Promise
      ? await cvModule
      : cvModule
  }
  return cvInstance
}

function orderCorners(points: number[][]) {
  const sorted = [...points].sort((a, b) => a[1] - b[1])
  const top = sorted.slice(0, 2).sort((a, b) => a[0] - b[0])
  const bottom = sorted.slice(2).sort((a, b) => a[0] - b[0])

  return [top[0], top[1], bottom[1], bottom[0]]
}

export async function detectAndCropDocument(image: Buffer): Promise<Buffer> {
  const cv = await getOpenCV()

  const { data, info } = await sharp(image)
    .resize({ width: 1200, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const src = new cv.Mat(
    info.height,
    info.width,
    cv.CV_8UC4
  )

  src.data.set(data)

  let gray: any
  let blurred: any
  let edges: any
  let contours: any
  let hierarchy: any
  let kernel: any
  let bestContour: any
  let approx: any
  let transform: any
  let destination: any
  let warped: any

  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    edges = new cv.Mat()
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 50, 150)

    kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    cv.dilate(edges, edges, kernel)

    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    )

    let largestArea = 0
    let corners: number[][] | null = null

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const perimeter = cv.arcLength(contour, true)
      const candidate = new cv.Mat()

      cv.approxPolyDP(
        contour,
        candidate,
        0.02 * perimeter,
        true
      )

      const area = Math.abs(cv.contourArea(candidate))

      if (
        candidate.rows === 4 &&
        cv.isContourConvex(candidate) &&
        area > largestArea &&
        area > (info.width * info.height) * 0.15
      ) {
        largestArea = area
        corners = []

        for (let j = 0; j < 4; j++) {
          corners.push([
            candidate.data32S[j * 2],
            candidate.data32S[j * 2 + 1],
          ])
        }
      }

      candidate.delete()
      contour.delete()
    }

    if (!corners) {
      return image
    }

    const ordered = orderCorners(corners)

    const distance = (a: number[], b: number[]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1])

    const [tl, tr, br, bl] = ordered

    const width = Math.round(Math.max(
      distance(tl, tr),
      distance(bl, br)
    ))

    const height = Math.round(Math.max(
      distance(tl, bl),
      distance(tr, br)
    ))

    if (width < 300 || height < 300) {
      return image
    }

    transform = cv.matFromArray(
      4, 1, cv.CV_32FC2,
      ordered.flat()
    )

    destination = cv.matFromArray(
      4, 1, cv.CV_32FC2,
      [0, 0, width - 1, 0, width - 1, height - 1, 0, height - 1]
    )

    const matrix = cv.getPerspectiveTransform(
      transform,
      destination
    )

    warped = new cv.Mat()

    try {
      cv.warpPerspective(
        src,
        warped,
        matrix,
        new cv.Size(width, height)
      )
    } finally {
      matrix.delete()
    }

    const output = Buffer.from(warped.data)

    return sharp(output, {
      raw: {
        width,
        height,
        channels: 4,
      },
    }).jpeg({ quality: 90 }).toBuffer()

  } finally {
    src.delete()
    gray?.delete()
    blurred?.delete()
    edges?.delete()
    contours?.delete()
    hierarchy?.delete()
    kernel?.delete()
    transform?.delete()
    destination?.delete()
    warped?.delete()
  }
}
