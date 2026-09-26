'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

type SourceRow = {
  excelRowNumber: number
  taluk: string
  headCode: string
  subHeadCode: string
  releasedGrant: number
  month: string
  billNumber: string
  billDetails: string
  billAmount: number
  gstAmount: number
  gstDeduction: number
  gstYesNo: string
  tds: number
  totalDeduction: number
  netAmount: number
  balance: number
  tokenNumber: string
  billPreparedDate: string
  headOfficeSubmittedDate: string
  treasurySubmittedDate: string
  utrNumber: string
}

type MasterRecord = {
  id: string
  name?: string
  head_code?: string | number
  sub_head_code?: string | number
}

type PreviewRow = {
  row: SourceRow
  expenseDate: string
  talukId?: string
  headId?: string
  subHeadId?: string
  mappingError?: string
  validationError?: string
  duplicateError?: string
}

type ExpenseInsert = {
  expense_date: string
  taluk_id: string
  branch_id: null
  category_id: null
  head_id: string
  sub_head_id: string
  details: string | null
  bill_number: string | null
  token_number: string | null
  utr_number: string | null
  bill_prepared_date: string | null
  head_office_submitted_date: string | null
  treasury_submitted_date: string | null
  gst_applicable: boolean
  bill_amount: number
  gst_amount: number
  gst_deduction: number
  tds_deduction: number
  net_payable: number
}

const FINANCIAL_YEARS = [
  '2025-26',
  '2026-27',
]

const MONTH_NUMBERS: Record<string, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
}

const MONTH_ALIASES: Record<string, string> = {
  'ಜನವರಿ': 'JANUARY',
  'ಫೆಬ್ರವರಿ': 'FEBRUARY',
  'ಮಾರ್ಚ್': 'MARCH',
  'ಏಪ್ರಿಲ್': 'APRIL',
  'ಮೇ': 'MAY',
  'ಜೂನ್': 'JUNE',
  'ಜುಲೈ': 'JULY',
  'ಆಗಸ್ಟ್': 'AUGUST',
  'ಸೆಪ್ಟೆಂಬರ್': 'SEPTEMBER',
  'ಅಕ್ಟೋಬರ್': 'OCTOBER',
  'ನವೆಂಬರ್': 'NOVEMBER',
  'ಡಿಸೆಂಬರ್': 'DECEMBER',
}

const TALUK_ALIASES: Record<string, string> = {
  'ದೇವನಹಳ್ಳಿ': 'devanahalli',
  'ಹೊಸಕೋಟೆ': 'hoskote',
  'ನೆಲಮಂಗಲ': 'nelamangala',
  'ದೊಡ್ಡಬಳ್ಳಾಪುರ': 'doddaballapura',
  'ಬೆಂಗಳೂರು ಉತ್ತರ': 'bangalore north',
}


function normalizeHeader(value: unknown) {
  return (value ?? '')
    .toString()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}

function normalizeText(value: unknown) {
  return (value ?? '')
    .toString()
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeCode(value: unknown) {
  return (value ?? '')
    .toString()
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
}

function toNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const cleaned = value
    .toString()
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .replace(/\s/g, '')
    .trim()

  const number = Number(cleaned)

  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN').format(value)
}

function normalizeMonth(value: string) {
  const raw = value
    .replace(/\u00a0/g, ' ')
    .trim()

  return (
    MONTH_ALIASES[raw] ||
    raw.toUpperCase()
  )
}

function getFinancialYearStartYear(
  financialYear: string
) {
  return Number(
    financialYear.slice(0, 4)
  )
}

function monthToDate(
  financialYear: string,
  month: string
) {
  const startYear =
    getFinancialYearStartYear(
      financialYear
    )

  const monthNumber =
    MONTH_NUMBERS[
      normalizeMonth(month)
    ]

  if (!startYear || !monthNumber) {
    return ''
  }

  const calendarYear =
    monthNumber >= 4
      ? startYear
      : startYear + 1

  return `${calendarYear}-${String(
    monthNumber
  ).padStart(2, '0')}-01`
}

function normalizeExcelDate(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return ''
  }

  if (
    typeof value === 'number'
  ) {
    const parsed =
      XLSX.SSF.parse_date_code(
        value
      )

    if (!parsed) {
      return ''
    }

    return `${parsed.y}-${String(
      parsed.m
    ).padStart(2, '0')}-${String(
      parsed.d
    ).padStart(2, '0')}`
  }

  const raw = value
    .toString()
    .trim()

  if (!raw) {
    return ''
  }

  const ddmmyyyy =
    raw.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
    )

  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${String(
      Number(ddmmyyyy[2])
    ).padStart(2, '0')}-${String(
      Number(ddmmyyyy[1])
    ).padStart(2, '0')}`
  }

  const yyyymmdd =
    raw.match(
      /^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/
    )

  if (yyyymmdd) {
    return `${yyyymmdd[1]}-${String(
      Number(yyyymmdd[2])
    ).padStart(2, '0')}-${String(
      Number(yyyymmdd[3])
    ).padStart(2, '0')}`
  }

  return ''
}

function isGstApplicable(value: string) {
  const normalized = normalizeText(value)

  return [
    'ಹೌದು',
    'yes',
    'true',
    '1',
    'y',
  ].includes(normalized)
}

function buildDetails(row: SourceRow) {
  const parts = [
    row.billDetails
      ? `Bill: ${row.billDetails}`
      : '',
    row.billNumber
      ? `Bill No: ${row.billNumber}`
      : '',
    row.gstYesNo
      ? `GST: ${row.gstYesNo}`
      : '',
    row.tokenNumber
      ? `Token: ${row.tokenNumber}`
      : '',
    row.billPreparedDate
      ? `Bill Prepared: ${row.billPreparedDate}`
      : '',
    row.headOfficeSubmittedDate
      ? `HO Submitted: ${row.headOfficeSubmittedDate}`
      : '',
    row.treasurySubmittedDate
      ? `Treasury Submitted: ${row.treasurySubmittedDate}`
      : '',
    row.utrNumber
      ? `UTR: ${row.utrNumber}`
      : '',
  ].filter(Boolean)

  return parts.join(' | ')
}

function buildDuplicateKey(
  row: PreviewRow
) {
  return [
    row.expenseDate,
    row.talukId || '',
    row.headId || '',
    row.subHeadId || '',
    normalizeText(row.row.billNumber),
    normalizeText(row.row.billDetails),
    row.row.billAmount.toFixed(2),
    row.row.gstAmount.toFixed(2),
    row.row.gstDeduction.toFixed(2),
    row.row.tds.toFixed(2),
    row.row.totalDeduction.toFixed(2),
    row.row.netAmount.toFixed(2),
    normalizeText(row.row.tokenNumber),
    normalizeText(row.row.utrNumber),
  ].join('|')
}

export default function ExpenseImportPage() {
  const supabase = createClient()

  const [file, setFile] =
    useState<File | null>(null)

  const [financialYear, setFinancialYear] =
    useState('2025-26')

  const [rows, setRows] =
    useState<SourceRow[]>([])

  const [previewRows, setPreviewRows] =
    useState<PreviewRow[]>([])

  const [previewReady, setPreviewReady] =
    useState(false)

  const [isValidating, setIsValidating] =
    useState(false)

  const [isImporting, setIsImporting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [duplicateCount, setDuplicateCount] =
    useState(0)

  function resetPreview() {
    setRows([])
    setPreviewRows([])
    setPreviewReady(false)
    setErrorMessage('')
    setDuplicateCount(0)
  }

  function handleFileChange(
    selectedFile: File | null
  ) {
    setFile(selectedFile)
    resetPreview()
  }

  async function validateFile() {
    if (!file) {
      alert('Select the expense Excel/CSV file.')
      return
    }

    setIsValidating(true)
    setErrorMessage('')
    setDuplicateCount(0)
    setRows([])
    setPreviewRows([])
    setPreviewReady(false)

    try {
      const data =
        await file.arrayBuffer()

      /*
       * The supplied expense format is a fixed 21-column
       * Kannada/Excel structure. We intentionally map by
       * column position rather than header text. This avoids
       * failures caused by Excel/CSV encoding, spaces,
       * non-breaking spaces or Kannada header variations.
       *
       * The uploaded source uses the exact 21-column order
       * supplied by the user:
       *
       * 0  = ಕ್ರ.ಸಂ
       * 1  = ತಾಲ್ಲೂಕು
       * 2  = ಲೆಕ್ಕ ಶೀರ್ಷಿಕೆ
       * 3  = ಉಪ ಲೆಕ್ಕಶೀರ್ಷಿಕೆ
       * 4  = ಒಟ್ಟು ಬಿಡುಗಡೆಯಾದ ಅನುದಾನ
       * 5  = ಮಾಹೆ
       * 6  = ಬಿಲ್ಲಿನ ಸಂಖ್ಯೆ
       * 7  = ಬಿಲ್ಲಿನ ವಿವರ
       * 8  = ಬಿಲ್ಲಿನ ಮೊತ್ತ
       * 9  = ಜಿ.ಎಸ್.ಟಿ ಮೊತ್ತ
       * 10 = ಜಿ.ಎಸ್.ಟಿ
       * 11 = ಹೌದು/ಇಲ್ಲ
       * 12 = ಟಿ.ಡಿ.ಎಸ್
       * 13 = ಒಟ್ಟು ಕಟಾವಣೆ
       * 14 = ನಿವ್ವಳ ಮೊತ್ತ
       * 15 = ಉಳಿಕೆ
       * 16 = ಟೋಕನ್ ಸಂಖ್ಯೆ
       * 17 = ಬಿಲ್ಲನ್ನು ತಯಾರಿಸಲಾದ ದಿನಾಂಕ
       * 18 = ಮೇಲು ಸಹಿಗಾಗಿ ಪ್ರಧಾನ ಕಛೇರಿಗೆ ಸಲ್ಲಿಸಲಾದ ದಿನಾಂಕ
       * 19 = ಖಜಾನೆ ಇಲಾಖೆಗೆ ಸಲ್ಲಿಸಲಾದ ದಿನಾಂಕ
       * 20 = UTR ಸಂಖ್ಯೆ
       *
       * For the test row:
       * Bill Amount = 320000
       * GST Amount = 0
       * GST Deduction = 0
       * TDS = 25000
       * Total Deduction = 25000
       * Net Amount = 295000
       */
      const workbook =
        XLSX.read(
          data,
          {
            type: 'array',
            cellDates: true,
          }
        )

      if (
        workbook.SheetNames.length ===
        0
      ) {
        throw new Error(
          'The uploaded file does not contain a worksheet.'
        )
      }

      const worksheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ]

      if (!worksheet) {
        throw new Error(
          'Unable to read the first worksheet.'
        )
      }

      const sheetRows =
        XLSX.utils.sheet_to_json<
          any[]
        >(
          worksheet,
          {
            header: 1,
            defval: null,
            raw: true,
          }
        )

      if (
        sheetRows.length < 2
      ) {
        throw new Error(
          'The expense worksheet does not contain any data rows.'
        )
      }

      const headerRow =
        sheetRows[0] || []

      if (
        headerRow.length < 21
      ) {
        throw new Error(
          `The expense file contains ${headerRow.length} columns. The expected format contains 21 columns. Please upload the Kannada expense format without changing the column order.`
        )
      }

      const dataRows =
        sheetRows
          .slice(1)
          .filter(
            (row) =>
              row.some(
                (
                  cell: unknown
                ) =>
                  cell !==
                    null &&
                  cell !==
                    undefined &&
                  cell !== ''
              )
          )

      if (
        dataRows.length ===
        0
      ) {
        throw new Error(
          'No expense data was found in the worksheet.'
        )
      }

      const mappedRows:
        SourceRow[] =
        dataRows.map(
          (
            values,
            index
          ) => ({
            excelRowNumber:
              index + 2,

            taluk:
              values[1]
                ?.toString()
                .trim() || '',

            headCode:
              values[2]
                ?.toString()
                .trim() || '',

            subHeadCode:
              values[3]
                ?.toString()
                .trim() || '',

            releasedGrant:
              toNumber(
                values[4]
              ),

            month:
              values[5]
                ?.toString()
                .trim() || '',

            billNumber:
              values[6]
                ?.toString()
                .trim() || '',

            billDetails:
              values[7]
                ?.toString()
                .trim() || '',

            billAmount:
              toNumber(
                values[8]
              ),

            gstAmount:
              toNumber(
                values[9]
              ),

            /*
             * The Kannada format contains a separate GST
             * deduction column after GST Amount.
             * A blank cell is correctly treated as 0.
             */
            gstDeduction:
              toNumber(
                values[10]
              ),

            gstYesNo:
              values[11]
                ?.toString()
                .trim() || '',

            tds:
              toNumber(
                values[12]
              ),

            totalDeduction:
              toNumber(
                values[13]
              ),

            netAmount:
              toNumber(
                values[14]
              ),

            balance:
              toNumber(
                values[15]
              ),

            tokenNumber:
              values[16]
                ?.toString()
                .trim() || '',

            billPreparedDate:
              normalizeExcelDate(
                values[17]
              ),

            headOfficeSubmittedDate:
              normalizeExcelDate(
                values[18]
              ),

            treasurySubmittedDate:
              normalizeExcelDate(
                values[19]
              ),

            utrNumber:
              values[20]
                ?.toString()
                .trim() || '',
          })
        )

      setRows(mappedRows)

      const [
        {
          data: taluks,
          error: talukError,
        },
        {
          data: heads,
          error: headError,
        },
        {
          data: subHeads,
          error: subHeadError,
        },
      ] = await Promise.all([
        supabase
          .from('taluks')
          .select('id,name'),

        supabase
          .from('budget_heads')
          .select(
            'id,head_code'
          ),

        supabase
          .from('budget_sub_heads')
          .select(
            'id,sub_head_code'
          ),
      ])

      if (talukError) {
        throw new Error(
          `Unable to load taluks: ${talukError.message}`
        )
      }

      if (headError) {
        throw new Error(
          `Unable to load budget heads: ${headError.message}`
        )
      }

      if (subHeadError) {
        throw new Error(
          `Unable to load budget sub-heads: ${subHeadError.message}`
        )
      }

      const talukMap =
        new Map(
          (
            taluks ||
            []
          ).map(
            (
              taluk: MasterRecord
            ) => [
              normalizeText(
                taluk.name
              ),
              taluk.id,
            ]
          )
        )

      const headMap =
        new Map(
          (
            heads ||
            []
          ).map(
            (
              head: MasterRecord
            ) => [
              normalizeCode(
                head.head_code
              ),
              head.id,
            ]
          )
        )

      const subHeadMap =
        new Map(
          (
            subHeads ||
            []
          ).map(
            (
              subHead: MasterRecord
            ) => [
              normalizeCode(
                subHead.sub_head_code
              ),
              subHead.id,
            ]
          )
        )

      const resolvedRows:
        PreviewRow[] =
        mappedRows.map(
          (row) => {
            const missing:
              string[] =
              []

            const talukId =
              talukMap.get(
                normalizeText(
                  row.taluk
                )
              ) ||
              talukMap.get(
                normalizeText(
                  TALUK_ALIASES[
                    row.taluk
                  ] ||
                    row.taluk
                )
              )

            const headId =
              headMap.get(
                normalizeCode(
                  row.headCode
                )
              )

            const subHeadId =
              subHeadMap.get(
                normalizeCode(
                  row.subHeadCode
                )
              )

            if (
              !talukId
            ) {
              missing.push(
                `Taluk "${row.taluk || 'blank'}"`
              )
            }

            if (
              !headId
            ) {
              missing.push(
                `Head "${row.headCode || 'blank'}"`
              )
            }

            if (
              !subHeadId
            ) {
              missing.push(
                `Sub-head "${row.subHeadCode || 'blank'}"`
              )
            }

            const normalizedMonth =
              normalizeMonth(
                row.month
              )

            if (
              !MONTH_NUMBERS[
                normalizedMonth
              ]
            ) {
              missing.push(
                `Month "${row.month || 'blank'}"`
              )
            }

            const expenseDate =
              row.billPreparedDate ||
              monthToDate(
                financialYear,
                normalizedMonth
              )

            if (
              !expenseDate
            ) {
              missing.push(
                'Expense date could not be determined.'
              )
            }

            const validationErrors:
              string[] =
              []

            const calculatedDeduction =
              row.gstDeduction +
              row.tds

            /*
             * In the uploaded file, the GST field is a
             * yes/no flag and GST deduction is not supplied
             * as a separate monetary value. Therefore for
             * this source format:
             *
             * Total Deduction = GST Deduction (0) + TDS
             */
            if (
              Math.abs(
                calculatedDeduction -
                  row.totalDeduction
              ) > 0.01
            ) {
              validationErrors.push(
                'Total Deduction does not equal TDS for this source format.'
              )
            }

            const calculatedNet =
              row.billAmount -
              row.totalDeduction

            if (
              Math.abs(
                calculatedNet -
                  row.netAmount
              ) > 0.01
            ) {
              validationErrors.push(
                'Net Amount does not equal Bill Amount - Total Deduction.'
              )
            }

            if (
              row.billAmount <
                0 ||
              row.gstAmount <
                0 ||
              row.gstDeduction <
                0 ||
              row.tds <
                0 ||
              row.totalDeduction <
                0 ||
              row.netAmount <
                0
            ) {
              validationErrors.push(
                'Amount values cannot be negative.'
              )
            }

            if (
              row.balance <
                0
            ) {
              validationErrors.push(
                'Balance cannot be negative.'
              )
            }

            if (
              row.netAmount >
                row.releasedGrant
            ) {
              validationErrors.push(
                'Net Amount is greater than the released grant shown in the source row.'
              )
            }

            return {
              row,
              expenseDate,
              talukId,
              headId,
              subHeadId,
              mappingError:
                missing.length >
                0
                  ? missing.join(
                      ', '
                    )
                  : undefined,
              validationError:
                validationErrors.length >
                0
                  ? validationErrors.join(
                      ' '
                    )
                  : undefined,
            }
          }
        )

      const sourceKeys =
        new Map<
          string,
          number[]
        >()

      resolvedRows.forEach(
        (item) => {
          if (
            item.mappingError ||
            item.validationError ||
            !item.talukId ||
            !item.headId ||
            !item.subHeadId
          ) {
            return
          }

          const key =
            buildDuplicateKey(
              item
            )

          const numbers =
            sourceKeys.get(
              key
            ) || []

          numbers.push(
            item.row
              .excelRowNumber
          )

          sourceKeys.set(
            key,
            numbers
          )
        }
      )

      resolvedRows.forEach(
        (item) => {
          if (
            item.mappingError ||
            item.validationError ||
            !item.talukId ||
            !item.headId ||
            !item.subHeadId
          ) {
            return
          }

          const key =
            buildDuplicateKey(
              item
            )

          const matching =
            sourceKeys.get(
              key
            ) || []

          if (
            matching.length >
            1
          ) {
            const otherRows =
              matching
                .filter(
                  (
                    rowNumber
                  ) =>
                    rowNumber !==
                    item.row
                      .excelRowNumber
                )
                .join(', ')

            item.duplicateError =
              `Duplicate row in this file. Also appears in row(s): ${otherRows}`
          }
        }
      )

      /*
       * The current expenses table does not have separate
       * bill number / token / UTR columns. Existing records are
       * therefore compared using the same stored details payload.
       */
      const {
        data: existingExpenses,
        error: existingExpenseError,
      } = await supabase
        .from('expenses')
        .select(`
          expense_date,
          taluk_id,
          head_id,
          sub_head_id,
          details,
          bill_number,
          token_number,
          utr_number,
          bill_prepared_date,
          head_office_submitted_date,
          treasury_submitted_date,
          gst_applicable,
          bill_amount,
          gst_amount,
          gst_deduction,
          tds_deduction,
          net_payable
        `)
        .gte(
          'expense_date',
          `${getFinancialYearStartYear(
            financialYear
          )}-04-01`
        )
        .lt(
          'expense_date',
          `${getFinancialYearStartYear(
            financialYear
          ) + 1}-04-01`
        )

      if (
        existingExpenseError
      ) {
        throw new Error(
          `Unable to check existing expenses: ${existingExpenseError.message}`
        )
      }

      const existingKeys =
        new Set(
          (
            existingExpenses ||
            []
          ).map(
            (expense: any) =>
              [
                expense.expense_date,
                expense.taluk_id ||
                  '',
                expense.head_id ||
                  '',
                expense.sub_head_id ||
                  '',
                normalizeText(
                  expense.bill_number
                ),
                normalizeText(
                  expense.token_number
                ),
                normalizeText(
                  expense.utr_number
                ),
                expense.bill_prepared_date ||
                  '',
                Number(
                  expense.bill_amount ||
                    0
                ).toFixed(2),
                Number(
                  expense.gst_amount ||
                    0
                ).toFixed(2),
                Number(
                  expense.gst_deduction ||
                    0
                ).toFixed(2),
                Number(
                  expense.tds_deduction ||
                    0
                ).toFixed(2),
                Number(
                  expense.net_payable ||
                    0
                ).toFixed(2),
              ].join('|')
          )
        )

      resolvedRows.forEach(
        (item) => {
          if (
            item.mappingError ||
            item.validationError ||
            !item.talukId ||
            !item.headId ||
            !item.subHeadId
          ) {
            return
          }

          const keyParts = [
            item.expenseDate,
            item.talukId,
            item.headId,
            item.subHeadId,
            normalizeText(
              item.row.billNumber
            ),
            normalizeText(
              item.row.tokenNumber
            ),
            normalizeText(
              item.row.utrNumber
            ),
            item.row.billPreparedDate ||
              '',
            item.row.billAmount.toFixed(
              2
            ),
            item.row.gstAmount.toFixed(
              2
            ),
            item.row.gstDeduction.toFixed(
              2
            ),
            item.row.tds.toFixed(
              2
            ),
            item.row.netAmount.toFixed(
              2
            ),
          ]

          if (
            existingKeys.has(
              keyParts.join('|')
            )
          ) {
            item.duplicateError =
              item.duplicateError
                ? `${item.duplicateError} Already exists in expenses.`
                : 'Already exists in expenses.'
          }
        }
      )

      const duplicates =
        resolvedRows.filter(
          (item) =>
            item.duplicateError
        ).length

      setDuplicateCount(
        duplicates
      )

      setPreviewRows(
        resolvedRows
      )

      setPreviewReady(
        true
      )

      const errors =
        resolvedRows.filter(
          (item) =>
            item.mappingError ||
            item.validationError
        ).length

      if (
        errors > 0 ||
        duplicates > 0
      ) {
        setErrorMessage(
          `${errors} row(s) have mapping/validation errors and ${duplicates} row(s) are duplicates.`
        )
      }
    } catch (error: any) {
      console.error(
        'Expense validation error:',
        error
      )

      const message =
        error?.message ||
        'Unable to validate the expense file.'

      setErrorMessage(
        message
      )

      alert(message)
    } finally {
      setIsValidating(
        false
      )
    }
  }

  async function confirmImport() {
    const invalidRows =
      previewRows.filter(
        (item) =>
          item.mappingError ||
          item.validationError
      )

    const duplicateRows =
      previewRows.filter(
        (item) =>
          item.duplicateError
      )

    if (
      invalidRows.length >
      0
    ) {
      alert(
        'Please correct the mapping or validation errors before importing.'
      )
      return
    }

    if (
      duplicateRows.length >
      0
    ) {
      alert(
        'Duplicate expenses were detected. Remove them before importing.'
      )
      return
    }

    setIsImporting(
      true
    )

    try {
      const expenseRows:
        ExpenseInsert[] =
        previewRows.map(
          (item) => ({
            expense_date:
              item.expenseDate,

            taluk_id:
              item.talukId!,

            /*
             * The Kannada source format does not have
             * Branch or Expense Category columns.
             * The current expenses table allows both
             * fields to be null.
             */
            branch_id: null,
            category_id: null,

            head_id:
              item.headId!,

            sub_head_id:
              item.subHeadId!,

            details:
              item.row.billDetails ||
              null,

            bill_number:
              item.row.billNumber ||
              null,

            token_number:
              item.row.tokenNumber ||
              null,

            utr_number:
              item.row.utrNumber ||
              null,

            bill_prepared_date:
              item.row.billPreparedDate ||
              null,

            head_office_submitted_date:
              item.row.headOfficeSubmittedDate ||
              null,

            treasury_submitted_date:
              item.row.treasurySubmittedDate ||
              null,

            gst_applicable:
              isGstApplicable(
                item.row.gstYesNo
              ),

            bill_amount:
              item.row
                .billAmount,

            gst_amount:
              item.row
                .gstAmount,

            /*
             * "ಜಿ.ಎಸ್.ಟಿ" is the GST deduction amount.
             * "ಹೌದು/ಇಲ್ಲ" is preserved in Details.
             */
            gst_deduction:
              item.row
                .gstDeduction,

            tds_deduction:
              item.row.tds,

            net_payable:
              item.row.netAmount,
          })
        )

      /*
       * NOTE:
       * The source sheet has no direct Branch/Category fields.
       * It also has both GST Amount and GST Yes/No. The GST amount
       * is preserved in gst_amount; gst_deduction follows the
       * current table's deduction field. See note in the UI.
       */
      const { error } =
        await supabase
          .from('expenses')
          .insert(
            expenseRows
          )

      if (error) {
        throw new Error(
          `Expense import failed: ${error.message}`
        )
      }

      alert(
        `${expenseRows.length} expense row(s) imported successfully for ${financialYear}.`
      )

      setFile(null)
      setRows([])
      setPreviewRows([])
      setPreviewReady(false)
      setDuplicateCount(0)
      setErrorMessage('')
    } catch (error: any) {
      console.error(
        'Expense import error:',
        error
      )

      const message =
        error?.message ||
        'Unable to import the expenses.'

      setErrorMessage(
        message
      )

      alert(message)
    } finally {
      setIsImporting(
        false
      )
    }
  }

  const invalidCount =
    previewRows.filter(
      (item) =>
        item.mappingError ||
        item.validationError
    ).length

  const validCount =
    previewRows.filter(
      (item) =>
        !item.mappingError &&
        !item.validationError &&
        !item.duplicateError
    ).length

  const totalNet =
    previewRows.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.row.netAmount,
      0
    )

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="bg-white border rounded-xl shadow-sm p-5 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                ವೆಚ್ಚಗಳ ಆಮದು
                <span className="text-blue-700 text-lg md:text-xl ml-2">
                  (Expense Import)
                </span>
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Kannada expense format • Validate → Preview → Confirm
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              Expense Import
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
          <p className="font-semibold text-slate-800 mb-2">
            ಮೂಲ Excel ಸ್ವರೂಪ (Source Format)
          </p>

          <p className="text-sm text-slate-600">
            ನೀವು ನೀಡಿದ Kannada column structureನ್ನೇ ಈ importer ಬಳಸುತ್ತದೆ.
            Excel headerನಲ್ಲಿ ಇರುವ ಹೆಚ್ಚುವರಿ spaces ಮತ್ತು non-breaking spaces
            ಅನ್ನು ಸಹ ಇದು handle ಮಾಡುತ್ತದೆ.
          </p>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Financial Year
          </label>

          <select
            value={
              financialYear
            }
            onChange={(e) => {
              setFinancialYear(
                e.target.value
              )
              resetPreview()
            }}
            className="border p-3 rounded w-full"
            disabled={
              isValidating ||
              isImporting
            }
          >
            {FINANCIAL_YEARS.map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Expense File
          </label>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) =>
              handleFileChange(
                e.target.files?.[0] ||
                  null
              )
            }
            className="border p-2 rounded w-full"
            disabled={
              isValidating ||
              isImporting
            }
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={
              validateFile
            }
            disabled={
              !file ||
              isValidating ||
              isImporting
            }
            className="bg-black text-white px-5 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isValidating
              ? 'Validating...'
              : 'Validate & Preview'}
          </button>
        </div>
        </div>

        <div className="border border-blue-200 bg-blue-50 text-blue-800 rounded-xl p-4 mb-6">
        <p className="font-medium">
          Date handling
        </p>

        <p className="text-sm mt-1">
          If "ಬಿಲ್ಲನ್ನು ತಯಾರಿಸಲಾದ ದಿನಾಂಕ" is populated,
          that date is stored as expense_date. If it is
          blank, the importer falls back to the first day
          of the selected month in the selected financial
          year.
        </p>
      </div>

      <div className="border border-amber-300 bg-amber-50 text-amber-800 rounded-lg p-4 mb-6">
        <p className="font-medium">
          Current expenses table limitation
        </p>

        <p className="text-sm mt-1">
          Bill No, Token No, UTR and the three workflow
          dates are now stored in dedicated expense columns.
          "ಹೌದು/ಇಲ್ಲ" is stored in gst_applicable. Branch
          and Category remain null because this import
          format does not provide those fields.
        </p>
      </div>

      {errorMessage && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 mb-6 whitespace-pre-line">
          {errorMessage}
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-3">
            File Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">
                File
              </p>

              <p className="font-medium break-all">
                {file?.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Financial Year
              </p>

              <p className="font-medium">
                {financialYear}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Rows
              </p>

              <p className="font-medium">
                {rows.length}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Net Amount
              </p>

              <p className="font-medium">
                ₹{' '}
                {formatCurrency(
                  rows.reduce(
                    (
                      sum,
                      row
                    ) =>
                      sum +
                      row.netAmount,
                    0
                  )
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {previewReady && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Total Rows
              </p>

              <p className="text-2xl font-bold">
                {previewRows.length}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Ready
              </p>

              <p className="text-2xl font-bold text-green-600">
                {validCount}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Errors
              </p>

              <p className="text-2xl font-bold text-red-600">
                {invalidCount}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Duplicates
              </p>

              <p
                className={`text-2xl font-bold ${
                  duplicateCount >
                  0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {duplicateCount}
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">
                Expense Import Preview
              </h2>

              <p className="text-sm text-gray-600 mt-1">
                Nothing is inserted until Confirm Import is pressed.
              </p>

              <p className="text-xs text-gray-500 mt-2">
                The first four columns and the Status column stay visible while
                you scroll horizontally through the remaining fields.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[2450px] border-collapse">
                <thead>
                  <tr className="bg-[#163f63] text-white">
                    <th
                      className="sticky left-0 z-30 bg-[#163f63] border border-slate-300 p-2 text-left whitespace-nowrap"
                      style={{ width: 60, minWidth: 60 }}
                    >
                      Row
                    </th>

                    <th
                      className="sticky left-[60px] z-30 bg-[#163f63] border border-slate-300 p-2 text-left whitespace-nowrap"
                      style={{ width: 155, minWidth: 155 }}
                    >
                      ತಾಲ್ಲೂಕು
                    </th>

                    <th
                      className="sticky left-[215px] z-30 bg-[#163f63] border border-slate-300 p-2 text-left whitespace-nowrap"
                      style={{ width: 155, minWidth: 155 }}
                    >
                      ಲೆಕ್ಕ ಶೀರ್ಷಿಕೆ
                    </th>

                    <th
                      className="sticky left-[370px] z-30 bg-[#163f63] border border-slate-300 p-2 text-left whitespace-nowrap"
                      style={{ width: 145, minWidth: 145 }}
                    >
                      ಉಪ ಲೆಕ್ಕಶೀರ್ಷಿಕೆ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      ಮಾಹೆ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      ಬಿಲ್ಲಿನ ಸಂಖ್ಯೆ
                    </th>

                    <th className="border border-slate-300 p-2 text-left min-w-72">
                      ಬಿಲ್ಲಿನ ವಿವರ
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ಬಿಲ್ಲಿನ ಮೊತ್ತ
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ಜಿ.ಎಸ್.ಟಿ ಮೊತ್ತ
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ಜಿ.ಎಸ್.ಟಿ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      ಹೌದು/ಇಲ್ಲ
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ಟಿ.ಡಿ.ಎಸ್
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ಒಟ್ಟು ಕಟಾವಣೆ
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ನಿವ್ವಳ ಮೊತ್ತ
                    </th>

                    <th className="border border-slate-300 p-2 text-right whitespace-nowrap">
                      ಉಳಿಕೆ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      ಟೋಕನ್ ಸಂಖ್ಯೆ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      ಬಿಲ್ ತಯಾರಿಸಿದ ದಿನಾಂಕ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      HO ಸಲ್ಲಿಸಿದ ದಿನಾಂಕ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      ಖಜಾನೆ ಸಲ್ಲಿಸಿದ ದಿನಾಂಕ
                    </th>

                    <th className="border border-slate-300 p-2 text-left whitespace-nowrap">
                      UTR ಸಂಖ್ಯೆ
                    </th>

                    <th
                      className="sticky right-0 z-30 bg-[#163f63] border border-slate-300 p-2 text-left whitespace-nowrap"
                      style={{ width: 220, minWidth: 220 }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {previewRows.map(
                    (item) => {
                      const hasError =
                        Boolean(
                          item.mappingError ||
                            item.validationError ||
                            item.duplicateError
                        )

                      const rowBackground =
                        hasError
                          ? 'bg-red-50'
                          : 'bg-white'

                      return (
                        <tr
                          key={
                            item.row
                              .excelRowNumber
                          }
                          className={rowBackground}
                        >
                          <td
                            className={`sticky left-0 z-20 border border-slate-300 p-2 whitespace-nowrap ${rowBackground}`}
                            style={{
                              width: 60,
                              minWidth: 60,
                            }}
                          >
                            {
                              item.row
                                .excelRowNumber
                            }
                          </td>

                          <td
                            className={`sticky left-[60px] z-20 border border-slate-300 p-2 whitespace-nowrap ${rowBackground}`}
                            style={{
                              width: 155,
                              minWidth: 155,
                            }}
                          >
                            {item.row.taluk ||
                              '—'}
                          </td>

                          <td
                            className={`sticky left-[215px] z-20 border border-slate-300 p-2 whitespace-nowrap ${rowBackground}`}
                            style={{
                              width: 155,
                              minWidth: 155,
                            }}
                          >
                            {item.row.headCode ||
                              '—'}
                          </td>

                          <td
                            className={`sticky left-[370px] z-20 border border-slate-300 p-2 whitespace-nowrap ${rowBackground}`}
                            style={{
                              width: 145,
                              minWidth: 145,
                            }}
                          >
                            {item.row.subHeadCode ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.month ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.billNumber ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 min-w-72">
                            {item.row.billDetails ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.billAmount
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.gstAmount
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.gstDeduction
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.gstYesNo ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.tds
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.totalDeduction
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 text-right font-semibold whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.netAmount
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              item.row.balance
                            )}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.tokenNumber ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.billPreparedDate ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.headOfficeSubmittedDate ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.treasurySubmittedDate ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            {item.row.utrNumber ||
                              '—'}
                          </td>

                          <td
                            className={`sticky right-0 z-20 border border-slate-300 p-2 min-w-56 ${rowBackground}`}
                            style={{
                              width: 220,
                              minWidth: 220,
                            }}
                          >
                            {item.mappingError ? (
                              <div className="text-red-600 text-sm">
                                <span className="font-semibold">
                                  Mapping:
                                </span>{' '}
                                {
                                  item.mappingError
                                }
                              </div>
                            ) : item.validationError ? (
                              <div className="text-red-600 text-sm">
                                <span className="font-semibold">
                                  Validation:
                                </span>{' '}
                                {
                                  item.validationError
                                }
                              </div>
                            ) : item.duplicateError ? (
                              <div className="text-red-600 text-sm">
                                <span className="font-semibold">
                                  Duplicate:
                                </span>{' '}
                                {
                                  item.duplicateError
                                }
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-green-700 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {invalidCount === 0 &&
            duplicateCount === 0 && (
              <div className="mt-6 border border-green-200 bg-green-50 text-green-700 rounded-xl p-4">
                All rows passed mapping,
                arithmetic validation and duplicate
                checks. The import is ready.
              </div>
            )}

          <div className="mt-6 bg-white border rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="font-medium">
                Import Target
              </p>

              <p className="text-sm text-gray-600">
                Financial Year:{' '}
                {financialYear} •{' '}
                {previewRows.length} row(s) •
                Net ₹{' '}
                {formatCurrency(
                  totalNet
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPreviewRows([])
                  setPreviewReady(
                    false
                  )
                  setErrorMessage(
                    ''
                  )
                  setDuplicateCount(
                    0
                  )
                }}
                disabled={
                  isImporting
                }
                className="border px-4 py-2 rounded disabled:opacity-50"
              >
                Cancel Preview
              </button>

              <button
                type="button"
                onClick={
                  confirmImport
                }
                disabled={
                  isImporting ||
                  isValidating ||
                  previewRows.length ===
                    0 ||
                  invalidCount > 0 ||
                  duplicateCount >
                    0
                }
                className="bg-green-600 text-white px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting
                  ? 'Importing...'
                  : 'Confirm Import'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </main>
  )
}
