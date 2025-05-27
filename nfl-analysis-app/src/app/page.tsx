"use client";
import React, { useState } from "react";
import Papa, { ParseResult } from "papaparse";
import Select, { MultiValue, SingleValue } from "react-select";

type ColumnOption = { value: string; label: string };

export default function Home() {
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [responseVar, setResponseVar] = useState<SingleValue<ColumnOption>>(null);
  const [supportVars, setSupportVars] = useState<MultiValue<ColumnOption>>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results: ParseResult<Record<string, unknown>>) => {
        const colNames = results.meta.fields ?? [];
        const options: ColumnOption[] = colNames.map((col) => ({
          value: col,
          label: col,
        }));
        setColumns(options);
        setResponseVar(null);
        setSupportVars([]);
      },
    });
  };

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-start py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-red-600 tracking-wide">NFL Variable Selector</h1>

      <div className="bg-white border-2 border-blue-600 rounded-xl p-6 w-full max-w-xl shadow-md">
        <label className="block text-lg font-semibold mb-2 text-gray-800">
          Upload CSV
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="w-full text-black bg-gray-100 border border-blue-500 rounded p-2 file:bg-blue-600 file:text-white file:rounded file:px-4 file:py-1 hover:file:bg-blue-700"
        />
      </div>

      {columns.length > 0 && (
        <div className="bg-white border-2 border-red-600 rounded-xl p-6 mt-8 w-full max-w-xl shadow-md">
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-2 text-gray-800">Response Variable</label>
            <Select
              options={columns}
              value={responseVar}
              onChange={(val) => setResponseVar(val)}
              placeholder="Select response variable"
              isSearchable
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#f9fafb',
                  borderColor: '#3b82f6',
                }),
                singleValue: (base) => ({ ...base, color: '#111827' }),
                menu: (base) => ({ ...base, backgroundColor: 'white', color: 'black' }),
              }}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold mb-2 text-gray-800">Supporting Variables</label>
            <Select
              options={columns}
              value={supportVars}
              onChange={(vals) => setSupportVars(vals)}
              placeholder="Select supporting variables"
              isMulti
              isSearchable
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#f9fafb',
                  borderColor: '#ef4444',
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                }),
                menu: (base) => ({ ...base, backgroundColor: 'white', color: 'black' }),
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}