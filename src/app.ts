import fs from 'fs'

import { LaunchOptions } from 'puppeteer'

import { getCategories } from './functions/getCategories'
import { getSongs } from './functions/getSongs'

(async () => {
  try {
    const options: LaunchOptions = {
      headless: false,
      devtools: false,
    }

    /**
     * First, obtain metadata of how many page needs to be query.
     */
    console.log('[core]: obtaining metadata')
    const categories = await getCategories(options)
    console.log(`[core]: obtained! ${categories.length} page to query`)

    /**
     * Then, query songs in every page asynchronously
     */
    const songsPerCategory = await Promise.all(categories.map(async category => {
      try {
        const res = await getSongs(category, options)

        return res
      } catch {
        return null
      }
    }).filter(o => o !== null))

    console.log('[core]: generating data')
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }

    fs.writeFile('dist/all.json', JSON.stringify(songsPerCategory), () => {})
    songsPerCategory.map(category => {
      fs.writeFile(`dist/${category?.category}.json`, JSON.stringify(category),() => {})
    })

    console.log('[core]: done')

    return songsPerCategory
  } catch (e) {
    console.log('[core]: crash')
    throw e
  }
})()
