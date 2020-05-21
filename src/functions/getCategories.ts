import puppeteer, { LaunchOptions } from 'puppeteer'

import { Category } from '../@types/Category'

export const getCategories = async (options: LaunchOptions): Promise<Category[]> => {
  const browser = await puppeteer.launch(options)
  const page = await browser.newPage()

  await page.goto(`https://maimai.sega.jp/song/`, {
    waitUntil: 'networkidle0'
  })

  const categories = await page.$$eval('div.Search-box-categorybtn', elements => {
    const res = elements.map(element => {
      try {
        const elClass = element.className
        const elLink = element.querySelector('a')

        if (elLink !== null) {
          return {
            id: elClass.split(' ')[1],
            title: elLink.innerText,
            href: elLink.getAttribute('href'),
          }
        } else {
          throw 'yeet'
        }
      } catch {
        return {
          id: '#',
          title: '#',
          href: '#',
        }
      }
    }).filter(o => o.id !== '#')

    return res
  })

  await browser.close()

  return categories
}
