import fs from 'fs'

import puppeteer from 'puppeteer'
import scrollPageToBottom from 'puppeteer-autoscroll-down'

import { getCategories } from './functions/getCategories'

(async () => {
  // First, get available generes
  console.log('[core]: obtaining metadata')
  const categories = await getCategories()
  console.log(`[core]: obtained! ${categories.length} page to query`)

  // Then, get all songs data
  const songsPerCategory = await Promise.all(
    categories.map(async category => {
      console.log(`[unit/${category.id}]: new tab`)

      const browser = await puppeteer.launch({
        headless: true,
        // headless: false,
        // devtools: true,
        defaultViewport: {
          width: 1000,
          height: 1000,
        },
      })
      const page = await browser.newPage()

      console.log(`[unit/${category.id}]: navigate`)
      await page.goto(`https://maimai.sega.jp${category.href}`, {
        waitUntil: 'networkidle0'
      })
  
      console.log(`[unit/${category.id}]: scroll`)
      await scrollPageToBottom(page, 200, 300)
  
      console.log(`[unit/${category.id}]: parsing songs`)
      const total = await page.$$eval('.songs > div > * > .songs-data-box > .songs-data-box-music', elements => elements.length)
      const songs = await page.$$eval('.songs > div > * > .songs-data-box > .songs-data-box-music', async elements => {
        const res = await Promise.all(
          elements.map(element => {
            const imgEl = element.querySelector('.elAsset > img')
            const titleEl = element.querySelector('.songs-data-box-music > .titleText')
            const artistEl = element.querySelector('.songs-data-box-music > .artistBox > .artistText')
            const levelStd = Array.from(element.querySelectorAll('.songs-data-box-level.std > li'))
            const levelDx = Array.from(element.querySelectorAll('.songs-data-box-level.dx > li'))

            try {
              if (imgEl !== null && titleEl !== null && artistEl !== null) {
                return {
                  title: titleEl.innerHTML,
                  banner: `https://maimai.sega.jp${imgEl.getAttribute('src')}`,
                  difficulty: {
                    standard: levelStd.length == 0
                      ? null
                      : levelStd
                        .map(level => [level.className.slice(4), level.innerHTML])
                        .reduce((acc, [key, value]) => ({ ...acc, [key]: value === '' ? null : value }), {}),
                    deluxe: levelDx.length == 0
                      ? null
                      : levelDx
                        .map(level => [level.className.slice(4), level.innerHTML])
                        .reduce((acc, [key, value]) => ({ ...acc, [key]: value === '' ? null : value }), {}),
                  }
                }
              } else {
                throw 'yeet'
              }
            } catch (e) {
              console.error(e)
              console.log(imgEl, titleEl, artistEl)
              return {
                title: '#',
                banner: '#',
                difficulty: {
                  standard: null,
                  deluxe: null,
                }
              }
            }
          }).filter(o => o.title !== '#')
        )
  
        return res
      })

      await browser.close()
  
      console.log(`[unit/${category.id}]: done`)
      console.log(`[unit/${category.id}]: total ${total}`)
      console.log(`[unit/${category.id}]: parsed ${songs.length}`)
      return {
        category: category.id,
        title: category.title,
        analysis: {
          total,
          parsed: songs.length,
        },
        songs,
      }
  
    })
  )

  console.log('[core]: generating data')
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFile('dist/all.json', JSON.stringify(songsPerCategory), () => {})
  songsPerCategory.map(category => {
    fs.writeFile(`dist/${category.category}.json`, JSON.stringify(category),() => {})
  })

  console.log('[core]: done')

  return songsPerCategory
})()
