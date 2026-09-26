'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

type ExcelRow = {
  excelRowNumber: number
  taluk: string
  head: string
  subHead: string
  annualBudget: number
  installment1: number
  installment2: number
  installment3: number
  installment4: number
  totalReleased: number
}

type SupabaseTaluk = {
  id: string
  name: string
}

type SupabaseCode = {
  id: string
  head_code?: string | number
  sub_head_code?: string | number
}

type ResolvedRow = {
  row: ExcelRow
  talukId?: string
  budgetHeadId?: string
  budgetSubHeadId?: string
  mappingError?: string
  duplicateError?: string
}

type BudgetReleaseInsert = {
  financial_year: string
  month: string
  taluk_id: string
  branch_id: null
  budget_head_id: string
  budget_sub_head_id: string
  installment_1: number
  installment_2: number
  installment_3: number
  installment_4: number
  amount: number
  remarks: string
}

const FINANCIAL_YEARS = ['2025-26', '2026-27']

const MONTHS = [
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
  'JANUARY',
  'FEBRUARY',
  'MARCH',
]

const TALUK_ALIASES: Record<string, string> = {
  'ದೇವನಹಳ್ಳಿ': 'devanahalli',
  'ಹೊಸಕೋಟೆ': 'hoskote',
  'ನೆಲಮಂಗಲ': 'nelamangala',
  'ದೊಡ್ಡಬಳ್ಳಾಪುರ': 'doddaballapura',
  'ಬೆಂಗಳೂರು ಉತ್ತರ': 'bangalore north',
}

function normalizeText(value: unknown) {
  return value?.toString().trim().toLowerCase() || ''
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const cleaned = value
    .toString()
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .trim()

  const number = Number(cleaned)

  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN').format(value)
}

function getMappedTalukName(value: string) {
  const original = value.trim()

  return (
    TALUK_ALIASES[original] ||
    normalizeText(original)
  )
}

function getRowAmount(row: ExcelRow) {
  return (
    row.installment1 +
    row.installment2 +
    row.installment3 +
    row.installment4
  )
}

export default function ImportBudgetPage() {
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ExcelRow[]>([])
  const [previewRows, setPreviewRows] = useState<
    ResolvedRow[]
  >([])

  const [financialYear, setFinancialYear] =
    useState('2025-26')

  const [month, setMonth] = useState('APRIL')

  const [isValidating, setIsValidating] =
    useState(false)

  const [isImporting, setIsImporting] =
    useState(false)

  const [previewReady, setPreviewReady] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [duplicateCount, setDuplicateCount] =
    useState(0)

  function resetPreview() {
    setPreviewRows([])
    setPreviewReady(false)
    setErrorMessage('')
    setDuplicateCount(0)
  }

  function handleFileChange(
    selectedFile: File | null
  ) {
    setFile(selectedFile)
    setRows([])
    resetPreview()
  }

  async function validateFile() {
    if (!file) {
      alert('Select an Excel file')
      return
    }

    if (!financialYear || !month) {
      alert(
        'Select financial year and month before validating.'
      )
      return
    }

    setIsValidating(true)
    setErrorMessage('')
    setPreviewReady(false)
    setPreviewRows([])
    setDuplicateCount(0)

    try {
      const data = await file.arrayBuffer()

      const workbook = XLSX.read(data, {
        type: 'array',
      })

      if (workbook.SheetNames.length === 0) {
        throw new Error(
          'The Excel file does not contain any worksheet.'
        )
      }

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      if (!worksheet) {
        throw new Error(
          'Unable to read the first worksheet.'
        )
      }

      /*
       * Existing workbook structure:
       * 0 = serial / first column
       * 1 = Taluk
       * 2 = Head
       * 3 = Sub Head
       * 4 = Annual Budget
       * 5 = Installment 1
       * 6 = Installment 2
       * 7 = Installment 3
       * 8 = Installment 4
       * 9 = Total Released
       */
      const sheetRows = XLSX.utils.sheet_to_json<any[]>(
        worksheet,
        {
          header: 1,
          defval: null,
          raw: true,
        }
      )

      if (sheetRows.length < 2) {
        throw new Error(
          'The Excel worksheet does not contain any data rows.'
        )
      }

      const dataRows = sheetRows
        .slice(1)
        .filter((row) =>
          row.some(
            (cell: unknown) =>
              cell !== null &&
              cell !== undefined &&
              cell !== ''
          )
        )

      if (dataRows.length === 0) {
        throw new Error(
          'No budget data was found in the Excel file.'
        )
      }

      const mappedRows: ExcelRow[] = dataRows.map(
        (values, index) => ({
          excelRowNumber: index + 2,

          taluk:
            values[1]
              ?.toString()
              .trim() || '',

          head:
            values[2]
              ?.toString()
              .trim() || '',

          subHead:
            values[3]
              ?.toString()
              .trim() || '',

          annualBudget: toNumber(values[4]),

          installment1: toNumber(values[5]),

          installment2: toNumber(values[6]),

          installment3: toNumber(values[7]),

          installment4: toNumber(values[8]),

          totalReleased: toNumber(values[9]),
        })
      )

      setRows(mappedRows)

      const [
        { data: taluks, error: taluksError },
        { data: heads, error: headsError },
        { data: subHeads, error: subHeadsError },
      ] = await Promise.all([
        supabase
          .from('taluks')
          .select('id,name'),

        supabase
          .from('budget_heads')
          .select('id,head_code'),

        supabase
          .from('budget_sub_heads')
          .select('id,sub_head_code'),
      ])

      if (taluksError) {
        throw new Error(
          `Unable to load taluks: ${taluksError.message}`
        )
      }

      if (headsError) {
        throw new Error(
          `Unable to load budget heads: ${headsError.message}`
        )
      }

      if (subHeadsError) {
        throw new Error(
          `Unable to load budget sub-heads: ${subHeadsError.message}`
        )
      }

      const talukMap = new Map(
        (taluks as SupabaseTaluk[]).map((taluk) => [
          normalizeText(taluk.name),
          taluk.id,
        ])
      )

      const headMap = new Map(
        (heads as SupabaseCode[]).map((head) => [
          normalizeText(head.head_code),
          head.id,
        ])
      )

      const subHeadMap = new Map(
        (subHeads as SupabaseCode[]).map((subHead) => [
          normalizeText(subHead.sub_head_code),
          subHead.id,
        ])
      )

      const resolvedRows: ResolvedRow[] =
        mappedRows.map((row) => {
          const normalizedTaluk =
            normalizeText(row.taluk)

          const talukLookupName =
            getMappedTalukName(row.taluk)

          const talukId =
            talukMap.get(normalizedTaluk) ||
            talukMap.get(talukLookupName)

          const budgetHeadId =
            headMap.get(
              normalizeText(row.head)
            )

          const budgetSubHeadId =
            subHeadMap.get(
              normalizeText(row.subHead)
            )

          const missing: string[] = []

          if (!talukId) {
            missing.push(
              `Taluk "${row.taluk || 'blank'}"`
            )
          }

          if (!budgetHeadId) {
            missing.push(
              `Head "${row.head || 'blank'}"`
            )
          }

          if (!budgetSubHeadId) {
            missing.push(
              `Sub-head "${row.subHead || 'blank'}"`
            )
          }

          return {
            row,
            talukId,
            budgetHeadId,
            budgetSubHeadId,
            mappingError:
              missing.length > 0
                ? missing.join(', ')
                : undefined,
          }
        })

      /*
       * Detect duplicate rows inside the uploaded Excel file
       * before checking Supabase.
       */
      const excelKeys = new Map<string, number[]>()

      resolvedRows.forEach((item) => {
        if (
          !item.talukId ||
          !item.budgetHeadId ||
          !item.budgetSubHeadId
        ) {
          return
        }

        const key = [
          financialYear,
          month,
          item.talukId,
          item.budgetHeadId,
          item.budgetSubHeadId,
        ].join('|')

        const existing = excelKeys.get(key) || []
        existing.push(item.row.excelRowNumber)
        excelKeys.set(key, existing)
      })

      resolvedRows.forEach((item) => {
        if (
          !item.talukId ||
          !item.budgetHeadId ||
          !item.budgetSubHeadId
        ) {
          return
        }

        const key = [
          financialYear,
          month,
          item.talukId,
          item.budgetHeadId,
          item.budgetSubHeadId,
        ].join('|')

        const matchingRows =
          excelKeys.get(key) || []

        if (matchingRows.length > 1) {
          const otherRows = matchingRows
            .filter(
              (rowNumber) =>
                rowNumber !== item.row.excelRowNumber
            )
            .join(', ')

          item.duplicateError =
            `Duplicate row in this Excel file. Also appears in row(s): ${otherRows}`
        }
      })

      /*
       * Check Supabase for records already imported
       * for the selected financial year and month.
       *
       * We only check keys that were successfully mapped.
       */
      const { data: existingReleases, error: existingError } =
        await supabase
          .from('budget_releases')
          .select(
            'financial_year,month,taluk_id,budget_head_id,budget_sub_head_id'
          )
          .eq('financial_year', financialYear)
          .eq('month', month)

      if (existingError) {
        throw new Error(
          `Unable to check existing budget releases: ${existingError.message}`
        )
      }

      const existingKeys = new Set(
        (existingReleases || []).map(
          (release: any) =>
            [
              release.financial_year,
              release.month,
              release.taluk_id,
              release.budget_head_id,
              release.budget_sub_head_id,
            ].join('|')
        )
      )

      resolvedRows.forEach((item) => {
        if (
          item.mappingError ||
          !item.talukId ||
          !item.budgetHeadId ||
          !item.budgetSubHeadId
        ) {
          return
        }

        const key = [
          financialYear,
          month,
          item.talukId,
          item.budgetHeadId,
          item.budgetSubHeadId,
        ].join('|')

        if (existingKeys.has(key)) {
          const dbDuplicateMessage =
            `Already imported for ${month} ${financialYear}.`

          item.duplicateError = item.duplicateError
            ? `${item.duplicateError} ${dbDuplicateMessage}`
            : dbDuplicateMessage
        }
      })

      const duplicateRows = resolvedRows.filter(
        (item) => item.duplicateError
      ).length

      setDuplicateCount(duplicateRows)
      setPreviewRows(resolvedRows)
      setPreviewReady(true)

      const invalidCount = resolvedRows.filter(
        (item) => item.mappingError
      ).length

      if (
        invalidCount > 0 &&
        duplicateRows > 0
      ) {
        setErrorMessage(
          `${invalidCount} row(s) have mapping errors and ${duplicateRows} row(s) are duplicates.`
        )
      } else if (invalidCount > 0) {
        setErrorMessage(
          `${invalidCount} row(s) need correction before import.`
        )
      } else if (duplicateRows > 0) {
        setErrorMessage(
          `${duplicateRows} row(s) already exist or are duplicated in the Excel file. Import is blocked until the duplicate rows are removed.`
        )
      }
    } catch (error: any) {
      console.error(
        'Budget validation error:',
        error
      )

      setPreviewRows([])
      setPreviewReady(false)

      const message =
        error?.message ||
        'Error reading or validating the Excel file.'

      setErrorMessage(message)
      alert(message)
    } finally {
      setIsValidating(false)
    }
  }

  async function confirmImport() {
    if (!previewReady || previewRows.length === 0) {
      return
    }

    const invalidRows = previewRows.filter(
      (item) => item.mappingError
    )

    const duplicateRows = previewRows.filter(
      (item) => item.duplicateError
    )

    if (invalidRows.length > 0) {
      alert(
        'Please correct the Excel mapping errors before importing.'
      )
      return
    }

    if (duplicateRows.length > 0) {
      alert(
        'Duplicate budget rows were detected. Remove the duplicate rows or choose a different financial year/month before importing.'
      )
      return
    }

    setIsImporting(true)
    setErrorMessage('')

    try {
      const budgetRows: BudgetReleaseInsert[] =
        previewRows.map(
          ({
            row,
            talukId,
            budgetHeadId,
            budgetSubHeadId,
          }) => {
            const amount = getRowAmount(row)

            return {
              financial_year: financialYear,
              month,

              taluk_id: talukId!,
              branch_id: null,

              budget_head_id:
                budgetHeadId!,

              budget_sub_head_id:
                budgetSubHeadId!,

              installment_1:
                row.installment1,

              installment_2:
                row.installment2,

              installment_3:
                row.installment3,

              installment_4:
                row.installment4,

              amount,

              remarks: 'Imported from Excel',
            }
          }
        )

      const { error: insertError } =
        await supabase
          .from('budget_releases')
          .insert(budgetRows)

      if (insertError) {
        throw new Error(
          `Budget release import failed: ${insertError.message}`
        )
      }

      alert(
        `${budgetRows.length} rows imported successfully for ${month} ${financialYear}.`
      )

      setFile(null)
      setRows([])
      setPreviewRows([])
      setPreviewReady(false)
      setDuplicateCount(0)
    } catch (error: any) {
      console.error(
        'Budget import error:',
        error
      )

      const message =
        error?.message ||
        'Error importing the budget data.'

      setErrorMessage(message)
      alert(message)
    } finally {
      setIsImporting(false)
    }
  }

  const validRowCount = previewRows.filter(
    (item) => !item.mappingError
  ).length

  const invalidRowCount = previewRows.filter(
    (item) => item.mappingError
  ).length

  const totalPreviewAmount = previewRows.reduce(
    (sum, item) => sum + getRowAmount(item.row),
    0
  )

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Import Budget Release
      </h1>

      {/* IMPORT SETTINGS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block font-medium mb-2">
            Financial Year
          </label>

          <select
            value={financialYear}
            onChange={(e) => {
              setFinancialYear(e.target.value)
              resetPreview()
            }}
            className="border p-3 rounded w-full"
            disabled={
              isValidating || isImporting
            }
          >
            {FINANCIAL_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">
            Month
          </label>

          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value)
              resetPreview()
            }}
            className="border p-3 rounded w-full"
            disabled={
              isValidating || isImporting
            }
          >
            {MONTHS.map((monthName) => (
              <option
                key={monthName}
                value={monthName}
              >
                {monthName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">
            Excel File
          </label>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) =>
              handleFileChange(
                e.target.files?.[0] || null
              )
            }
            className="border p-2 rounded w-full"
            disabled={
              isValidating || isImporting
            }
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={validateFile}
          disabled={
            !file ||
            isValidating ||
            isImporting
          }
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating
            ? 'Validating...'
            : 'Validate & Preview'}
        </button>

        {previewReady && (
          <button
            onClick={() => {
              setPreviewRows([])
              setPreviewReady(false)
              setErrorMessage('')
            }}
            disabled={isValidating || isImporting}
            className="border px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel Preview
          </button>
        )}
      </div>

      {/* VALIDATION MESSAGE */}
      {errorMessage && (
        <div className="mt-6 border border-red-300 bg-red-50 text-red-700 rounded p-4">
          {errorMessage}
        </div>
      )}

      {/* EXCEL DETECTION */}
      {rows.length > 0 && (
        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">
            File Details
          </h2>

          <p className="text-sm text-gray-700">
            <strong>File:</strong>{' '}
            {file?.name || 'Selected Excel file'}
          </p>

          <p className="text-sm text-gray-700">
            <strong>Financial Year:</strong>{' '}
            {financialYear}
          </p>

          <p className="text-sm text-gray-700">
            <strong>Month:</strong> {month}
          </p>

          <p className="text-sm text-gray-700">
            <strong>Rows detected:</strong>{' '}
            {rows.length}
          </p>
        </div>
      )}

      {/* PREVIEW SUMMARY */}
      {previewReady && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
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
                Valid Rows
              </p>

              <p className="text-2xl font-bold text-green-600">
                {validRowCount}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Rows With Errors
              </p>

              <p className="text-2xl font-bold text-red-600">
                {invalidRowCount}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Duplicate Rows
              </p>

              <p
                className={`text-2xl font-bold ${
                  duplicateCount > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {duplicateCount}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Total Release Amount
              </p>

              <p className="text-2xl font-bold">
                ₹ {formatCurrency(
                  totalPreviewAmount
                )}
              </p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">
                Import Preview
              </h2>

              <p className="text-sm text-gray-600 mt-1">
                Review the rows below. Nothing is inserted
                into the database until you click
                &quot;Confirm Import&quot;.
              </p>

              <p className="text-sm text-gray-600 mt-1">
                Duplicate protection checks both the uploaded Excel file
                and existing records for the selected financial year and month.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">
                      Excel Row
                    </th>

                    <th className="border p-2 text-left">
                      Taluk
                    </th>

                    <th className="border p-2 text-left">
                      Head
                    </th>

                    <th className="border p-2 text-left">
                      Sub-head
                    </th>

                    <th className="border p-2 text-right">
                      Installment 1
                    </th>

                    <th className="border p-2 text-right">
                      Installment 2
                    </th>

                    <th className="border p-2 text-right">
                      Installment 3
                    </th>

                    <th className="border p-2 text-right">
                      Installment 4
                    </th>

                    <th className="border p-2 text-right">
                      Amount
                    </th>

                    <th className="border p-2 text-left">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {previewRows.map(
                    (item) => {
                      const rowAmount =
                        getRowAmount(item.row)

                      const hasError =
                        Boolean(item.mappingError)

                      return (
                        <tr
                          key={
                            item.row
                              .excelRowNumber
                          }
                          className={
                            hasError
                              ? 'bg-red-50'
                              : ''
                          }
                        >
                          <td className="border p-2">
                            {item.row.excelRowNumber}
                          </td>

                          <td className="border p-2">
                            {item.row.taluk ||
                              '—'}
                          </td>

                          <td className="border p-2">
                            {item.row.head ||
                              '—'}
                          </td>

                          <td className="border p-2">
                            {item.row.subHead ||
                              '—'}
                          </td>

                          <td className="border p-2 text-right">
                            ₹{' '}
                            {formatCurrency(
                              item.row
                                .installment1
                            )}
                          </td>

                          <td className="border p-2 text-right">
                            ₹{' '}
                            {formatCurrency(
                              item.row
                                .installment2
                            )}
                          </td>

                          <td className="border p-2 text-right">
                            ₹{' '}
                            {formatCurrency(
                              item.row
                                .installment3
                            )}
                          </td>

                          <td className="border p-2 text-right">
                            ₹{' '}
                            {formatCurrency(
                              item.row
                                .installment4
                            )}
                          </td>

                          <td className="border p-2 text-right font-medium">
                            ₹{' '}
                            {formatCurrency(
                              rowAmount
                            )}
                          </td>

                          <td className="border p-2">
                            {hasError ? (
                              <span className="text-red-600 text-sm">
                                {item.mappingError}
                              </span>
                            ) : item.duplicateError ? (
                              <span className="text-red-600 text-sm">
                                {item.duplicateError}
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">
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

          {invalidRowCount === 0 &&
            duplicateCount === 0 && (
              <div className="mt-6 border border-green-300 bg-green-50 text-green-700 rounded p-4">
                All rows passed validation and duplicate checks.
                The import is ready for confirmation.
              </div>
            )}

          {/* CONFIRMATION */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border rounded-lg p-4">
            <div>
              <p className="font-medium">
                Import target
              </p>

              <p className="text-sm text-gray-600">
                {financialYear} • {month} •{' '}
                {previewRows.length} row(s)
              </p>

              {duplicateCount > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Import is blocked because duplicate rows were detected.
                </p>
              )}
            </div>

            <button
              onClick={confirmImport}
              disabled={
                invalidRowCount > 0 ||
                duplicateCount > 0 ||
                isImporting ||
                isValidating ||
                previewRows.length === 0
              }
              className="bg-green-600 text-white px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting
                ? 'Importing...'
                : 'Confirm Import'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
