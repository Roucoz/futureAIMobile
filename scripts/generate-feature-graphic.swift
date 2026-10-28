#!/usr/bin/env swift
//
// Generates the Google Play feature graphic (1024x500 PNG, opaque) from the app icon.
//
//   swift scripts/generate-feature-graphic.swift
//   → release-assets/feature-graphic-1024x500.png
//
// Design notes:
//   * Play requires 1024x500, JPEG or 24-bit PNG, NO transparency → white background.
//   * Play overlays the app icon + name on the BOTTOM-LEFT of this image on phone
//     listings, so the bottom ~150px is deliberately left empty.
//   * The accent bar under the wordmark uses colours sampled from the icon itself,
//     so the two can never drift apart.
//   * Text is taken from brand/BRAND.md (approved tagline). Do not invent claims here.
//   * DM Sans is the brand typeface; if it is not installed we fall back to Avenir Next
//     (closest available humanist geometric sans). Install DM Sans and re-run to switch.
//
import AppKit
import CoreGraphics
import CoreText
import Foundation

// ─── what to draw ────────────────────────────────────────────────────────────
let title = "Tuxon"
let tagline = "Turn every conversation into results with AI"

let canvasW = 1024
let canvasH = 500

let iconSize: CGFloat = 190
let iconTop: CGFloat = 45
let titleSize: CGFloat = 62
let taglineSize: CGFloat = 24

let ruleWidth: CGFloat = 150
let ruleHeight: CGFloat = 5

let titleColor = CGColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // #0F172A
let taglineColor = CGColor(red: 0.357, green: 0.392, blue: 0.447, alpha: 1) // #5B6472

// ─── paths ───────────────────────────────────────────────────────────────────
let scriptDir = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
let repoRoot = scriptDir.deletingLastPathComponent()
let iconPath = repoRoot.appendingPathComponent("release-assets/icon-1024-master.png").path
let outPath = repoRoot.appendingPathComponent("release-assets/feature-graphic-1024x500.png").path

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("✖ \(message)\n".data(using: .utf8)!)
    exit(1)
}

guard let iconImage = NSImage(contentsOfFile: iconPath),
      let iconCG = iconImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fail("could not load icon at \(iconPath)")
}

// ─── sample the icon's own teal + orange so the accent bar always matches ────
func hsbHue(_ r: Double, _ g: Double, _ b: Double) -> (h: Double, s: Double, v: Double) {
    let maxV = max(r, g, b), minV = min(r, g, b)
    let delta = maxV - minV
    var h = 0.0
    if delta > 0 {
        if maxV == r { h = ((g - b) / delta).truncatingRemainder(dividingBy: 6) / 6 }
        else if maxV == g { h = (((b - r) / delta) + 2) / 6 }
        else { h = (((r - g) / delta) + 4) / 6 }
        if h < 0 { h += 1 }
    }
    return (h, maxV > 0 ? delta / maxV : 0, maxV)
}

func sampleAccentColors(from image: CGImage) -> (CGColor, CGColor) {
    let w = image.width, h = image.height
    var buffer = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(
        data: &buffer, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return (CGColor(red: 0.086, green: 0.467, blue: 1, alpha: 1), CGColor(red: 0.949, green: 0.557, blue: 0.294, alpha: 1)) }
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))

    var teal: (sat: Double, r: Double, g: Double, b: Double) = (0, 0, 0, 0)
    var orange = teal

    for y in stride(from: 0, to: h, by: 2) {
        for x in stride(from: 0, to: w, by: 2) {
            let i = (y * w + x) * 4
            let r = Double(buffer[i]) / 255, g = Double(buffer[i + 1]) / 255, b = Double(buffer[i + 2]) / 255
            let (hue, sat, val) = hsbHue(r, g, b)
            let weight = sat * val
            guard sat > 0.25, val > 0.25 else { continue }
            if hue >= 0.40, hue <= 0.60, weight > teal.sat { teal = (weight, r, g, b) }
            if (hue <= 0.12 || hue >= 0.02), hue >= 0.02, hue <= 0.12, weight > orange.sat { orange = (weight, r, g, b) }
        }
    }

    print(String(format: "  sampled teal   rgb(%.0f, %.0f, %.0f)", teal.r * 255, teal.g * 255, teal.b * 255))
    print(String(format: "  sampled orange rgb(%.0f, %.0f, %.0f)", orange.r * 255, orange.g * 255, orange.b * 255))

    let tealColor = teal.sat > 0 ? CGColor(red: teal.r, green: teal.g, blue: teal.b, alpha: 1) : CGColor(red: 0.086, green: 0.467, blue: 1, alpha: 1)
    let orangeColor = orange.sat > 0 ? CGColor(red: orange.r, green: orange.g, blue: orange.b, alpha: 1) : CGColor(red: 0.949, green: 0.557, blue: 0.294, alpha: 1)
    return (tealColor, orangeColor)
}

print("Reading icon: \(iconPath)")
let (tealColor, orangeColor) = sampleAccentColors(from: iconCG)

// ─── canvas (opaque — Play rejects transparency) ─────────────────────────────
guard let ctx = CGContext(
    data: nil, width: canvasW, height: canvasH, bitsPerComponent: 8, bytesPerRow: canvasW * 4,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fail("could not create the drawing context") }

ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: canvasW, height: canvasH))

/// CoreGraphics' origin is bottom-left; this flips a "top" coordinate for us.
func cgY(top: CGFloat, height: CGFloat) -> CGFloat { CGFloat(canvasH) - top - height }

// icon, horizontally centred
let iconX = (CGFloat(canvasW) - iconSize) / 2
ctx.draw(iconCG, in: CGRect(x: iconX, y: cgY(top: iconTop, height: iconSize), width: iconSize, height: iconSize))

func font(named names: [String], size: CGFloat) -> CTFont {
    for name in names {
        let candidate = CTFontCreateWithName(name as CFString, size, nil)
        if (CTFontCopyPostScriptName(candidate) as String).lowercased().hasPrefix(name.lowercased()) {
            return candidate
        }
    }
    return CTFontCreateWithName("Helvetica" as CFString, size, nil)
}

func drawCentred(_ text: String, font: CTFont, color: CGColor, baselineTop: CGFloat) {
    let attributes: [NSAttributedString.Key: Any] = [
        kCTFontAttributeName as NSAttributedString.Key: font,
        kCTForegroundColorAttributeName as NSAttributedString.Key: color,
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attributes))
    let width = CTLineGetTypographicBounds(line, nil, nil, nil)
    ctx.textPosition = CGPoint(x: (CGFloat(canvasW) - CGFloat(width)) / 2, y: cgY(top: baselineTop, height: 0))
    CTLineDraw(line, ctx)
}

let titleFont = font(named: ["DM Sans", "DMSans-Bold", "AvenirNext-Bold"], size: titleSize)
let taglineFont = font(named: ["DM Sans", "DMSans-Medium", "AvenirNext-Medium"], size: taglineSize)
print("  title font: \(CTFontCopyPostScriptName(titleFont) as String)")

drawCentred(title, font: titleFont, color: titleColor, baselineTop: 312)
print(String(format: "  title width: %.0fpx", CTLineGetTypographicBounds(CTLineCreateWithAttributedString(NSAttributedString(string: title, attributes: [kCTFontAttributeName as NSAttributedString.Key: titleFont])), nil, nil, nil)))

// gradient accent bar between the wordmark and the tagline
let ruleTop: CGFloat = 330
let ruleX = (CGFloat(canvasW) - ruleWidth) / 2
ctx.saveGState()
let ruleRect = CGRect(x: ruleX, y: cgY(top: ruleTop, height: ruleHeight), width: ruleWidth, height: ruleHeight)
ctx.addPath(CGPath(roundedRect: ruleRect, cornerWidth: ruleHeight / 2, cornerHeight: ruleHeight / 2, transform: nil))
ctx.clip()
if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [tealColor, orangeColor] as CFArray, locations: [0, 1]) {
    ctx.drawLinearGradient(gradient, start: CGPoint(x: ruleX, y: 0), end: CGPoint(x: ruleX + ruleWidth, y: 0), options: [])
}
ctx.restoreGState()

drawCentred(tagline, font: taglineFont, color: taglineColor, baselineTop: 372)

// ─── write ───────────────────────────────────────────────────────────────────
guard let image = ctx.makeImage() else { fail("could not render the image") }
let rep = NSBitmapImageRep(cgImage: image)
guard let data = rep.representation(using: .png, properties: [:]) else { fail("could not encode the PNG") }
try data.write(to: URL(fileURLWithPath: outPath))

let taglineWidth = CTLineGetTypographicBounds(
    CTLineCreateWithAttributedString(NSAttributedString(string: tagline, attributes: [kCTFontAttributeName as NSAttributedString.Key: taglineFont])),
    nil, nil, nil
)
print(String(format: "  tagline width: %.0fpx (canvas 1024, margins %.0fpx each side)", taglineWidth, (1024 - taglineWidth) / 2))
print("✓ wrote \(outPath)  (\(canvasW)x\(canvasH), \(data.count / 1024) KB)")
