'use client'

import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

interface DataGridProps<T> {
  rows: T[]
  columns: ColDef<T>[]
  height?: number | string
  className?: string
}

export function DataGrid<T extends object>({ rows, columns, height = 480, className }: DataGridProps<T>) {
  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1,
    minWidth: 120,
  }), [])

  return (
    <div className={`ag-theme-quartz ${className || ''}`} style={{ height }}>
      <AgGridReact<T>
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        animateRows
      />
    </div>
  )
}

