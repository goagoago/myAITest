import { ref, reactive, computed, watch } from 'vue'
import { areaData, getProvinces, getCities, getDistricts } from '../data/areaCodes.js'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// 身份证校验码权重因子（GB 11643-1999）
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
// 校验码映射表：余数 0-10 对应校验码
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/**
 * 计算身份证第18位校验码
 * 前17位数字分别乘以权重因子求和，模11取余后查表
 */
function calcCheckCode(id17) {
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id17[i]) * WEIGHTS[i]
  }
  return CHECK_CODES[sum % 11]
}

/**
 * 随机整数 [min, max]
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 补零
 */
function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

/**
 * 获取某月的天数
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

/**
 * 随机生成一个地区码（6位）
 */
function randomAreaCode(provinceCode, cityCode, districtCode) {
  if (!provinceCode) {
    const provinces = Object.keys(areaData)
    provinceCode = provinces[randInt(0, provinces.length - 1)]
  }

  const province = areaData[provinceCode]
  if (!province) return null

  if (!cityCode) {
    const cities = Object.keys(province.children)
    cityCode = cities[randInt(0, cities.length - 1)]
  }

  const city = province.children[cityCode]
  if (!city) return null

  if (!districtCode) {
    const districts = Object.keys(city.children)
    districtCode = districts[randInt(0, districts.length - 1)]
  }

  return provinceCode + cityCode + districtCode
}

/**
 * 随机生成出生日期 YYYYMMDD
 */
function randomBirthDate(startYear, endYear, specificMonth, specificDay) {
  const year = randInt(startYear, endYear)
  const month = specificMonth || randInt(1, 12)
  const maxDay = getDaysInMonth(year, month)
  const day = specificDay ? Math.min(specificDay, maxDay) : randInt(1, maxDay)
  return pad(year, 4) + pad(month) + pad(day)
}

/**
 * 随机生成顺序码（3位: 001-999），控制性别
 * 第17位（顺序码第3位）：奇数=男，偶数=女
 */
function randomSequenceCode(gender) {
  if (gender === 'male') {
    // 奇数结尾: 001,003,...,999
    const n = randInt(0, 499)
    return pad(n * 2 + 1, 3)
  }
  if (gender === 'female') {
    // 偶数结尾: 002,004,...,998
    const n = randInt(1, 499)
    return pad(n * 2, 3)
  }
  // 随机 001-999
  return pad(randInt(1, 999), 3)
}

/**
 * 生成单个身份证号
 */
function generateOne(options) {
  const areaCode = randomAreaCode(
    options.provinceCode || '',
    options.cityCode || '',
    options.districtCode || ''
  )
  if (!areaCode) return null

  // 支持指定具体年份或年份范围
  const startY = options.yearMode === 'exact' ? options.exactYear : options.startYear
  const endY = options.yearMode === 'exact' ? options.exactYear : options.endYear

  const birthDate = randomBirthDate(
    startY,
    endY,
    options.specificMonth,
    options.specificDay,
  )

  const seqCode = randomSequenceCode(options.gender)
  const id17 = areaCode + birthDate + seqCode
  const checkCode = calcCheckCode(id17)

  return id17 + checkCode
}

/**
 * 解析身份证号，返回详细信息
 */
function parseIdNumber(id) {
  const provinceCode = id.substring(0, 2)
  const cityCode = id.substring(2, 4)
  const districtCode = id.substring(4, 6)
  const year = id.substring(6, 10)
  const month = id.substring(10, 12)
  const day = id.substring(12, 14)
  const seqCode = id.substring(14, 17)
  const gender = parseInt(seqCode) % 2 === 1 ? '男' : '女'

  const province = areaData[provinceCode]
  const city = province?.children[cityCode]
  const district = city?.children[districtCode]
  const areaName = [province?.name, city?.name, district].filter(Boolean).join(' ')

  return {
    id,
    areaCode: id.substring(0, 6),
    areaName,
    birthday: `${year}-${month}-${day}`,
    gender,
    age: new Date().getFullYear() - parseInt(year),
  }
}

/**
 * 验证18位身份证号校验码是否正确
 */
function verifyIdNumber(id) {
  if (!/^\d{17}[\dX]$/.test(id)) return false
  return calcCheckCode(id.substring(0, 17)) === id[17]
}

export function useIdGenerator() {
  const results = ref([])
  const copied = ref('')

  const options = reactive({
    provinceCode: '',
    cityCode: '',
    districtCode: '',
    gender: 'random',     // 'male' | 'female' | 'random'
    yearMode: 'range',    // 'range' | 'exact'
    startYear: 1970,
    endYear: 2005,
    exactYear: 2000,
    specificMonth: 0,     // 0 = 随机
    specificDay: 0,       // 0 = 随机
    count: 10,
  })

  const provinces = computed(() => getProvinces())

  const cities = computed(() => {
    if (!options.provinceCode) return []
    return getCities(options.provinceCode)
  })

  const districts = computed(() => {
    if (!options.provinceCode || !options.cityCode) return []
    return getDistricts(options.provinceCode, options.cityCode)
  })

  watch(() => options.provinceCode, () => {
    options.cityCode = ''
    options.districtCode = ''
  })

  watch(() => options.cityCode, () => {
    options.districtCode = ''
  })

  /**
   * 批量生成身份证号
   */
  const generate = () => {
    const count = Math.min(Math.max(options.count, 1), 200)
    const list = []
    for (let i = 0; i < count; i++) {
      const id = generateOne(options)
      if (id) {
        list.push(parseIdNumber(id))
      }
    }
    results.value = list
    copied.value = ''
  }

  /**
   * 复制单个身份证号
   */
  const copySingle = async (id) => {
    try {
      await navigator.clipboard.writeText(id)
      copied.value = id
      setTimeout(() => { copied.value = '' }, 1500)
    } catch {
      fallbackCopy(id)
    }
  }

  /**
   * 复制全部身份证号
   */
  const copyAll = async () => {
    const text = results.value.map(r => r.id).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      copied.value = 'all'
      setTimeout(() => { copied.value = '' }, 1500)
    } catch {
      fallbackCopy(text)
    }
  }

  /**
   * 回退复制方案
   */
  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = text.includes('\n') ? 'all' : text
    setTimeout(() => { copied.value = '' }, 1500)
  }

  /**
   * 导出为 Excel (.xlsx)
   */
  const exportXlsx = () => {
    if (!results.value.length) return
    const data = results.value.map((r, i) => ({
      '序号': i + 1,
      '身份证号码': r.id,
      '地区编码': r.areaCode,
      '地区名称': r.areaName,
      '出生日期': r.birthday,
      '性别': r.gender,
      '年龄': r.age,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },  // 序号
      { wch: 22 }, // 身份证号码
      { wch: 10 }, // 地区编码
      { wch: 20 }, // 地区名称
      { wch: 12 }, // 出生日期
      { wch: 6 },  // 性别
      { wch: 6 },  // 年龄
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '身份证号')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `身份证号_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  /**
   * 重置所有选项和结果
   */
  const reset = () => {
    options.provinceCode = ''
    options.cityCode = ''
    options.districtCode = ''
    options.gender = 'random'
    options.yearMode = 'range'
    options.startYear = 1970
    options.endYear = 2005
    options.exactYear = 2000
    options.specificMonth = 0
    options.specificDay = 0
    options.count = 10
    results.value = []
    copied.value = ''
  }

  return {
    options,
    results,
    copied,
    provinces,
    cities,
    districts,
    generate,
    copySingle,
    copyAll,
    exportXlsx,
    reset,
  }
}
