"use client";

import React, { useState } from "react";
import Papa, { ParseResult } from "papaparse";
import Select, { MultiValue, SingleValue } from "react-select";

type ColumnOption = { value: string; label: string };
type ResultType = Record<string, number | string | null>;

export default function Home() {
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [responseVar, setResponseVar] = useState<SingleValue<ColumnOption>>(null);
  const [supportVars, setSupportVars] = useState<MultiValue<ColumnOption>>([]);
  const [result, setResult] = useState<ResultType | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload file to backend
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("http://localhost:8000/upload-csv", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();
    setFilename(uploadData.filename);

    // Parse for column selection
    Papa.parse(file, {
      header: true,
      complete: (results: ParseResult<Record<string, unknown>>) => {
        const colNames = results.meta.fields ?? [];
        const options: ColumnOption[] = colNames.map((col) => ({ value: col, label: col }));
        setColumns(options);
        setResponseVar(null);
        setSupportVars([]);
        setResult(null);
      },
    });
  };

  const runFeatureImportance = async () => {
    if (!filename || !responseVar || supportVars.length === 0) return;

    const payload = {
      responseVar: responseVar.value,
      supportVars: supportVars.map((v) => v.value),
      filename,
    };

    try {
      const res = await fetch("http://localhost:8000/feature-importance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      setResult({ error: "Failed to fetch feature importance." });
    }
  };

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-red-600">NFL Variable Selector</h1>

      <div className="bg-white border-2 border-blue-600 rounded-xl p-6 w-full max-w-xl shadow-md">
        <label className="block text-lg font-semibold mb-2">Upload CSV</label>
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
            <label className="block text-lg font-semibold mb-2">Response Variable</label>
            <Select
              options={columns}
              value={responseVar}
              onChange={(val) => setResponseVar(val)}
              placeholder="Select response variable"
              isSearchable
              isClearable
            />
          </div>

          <div>
            <label className="block text-lg font-semibold mb-2">Supporting Variables</label>
            <Select
              options={columns}
              value={supportVars}
              onChange={(vals) => setSupportVars(vals)}
              placeholder="Select supporting variables"
              isMulti
              isSearchable
            />
          </div>

          <button
            onClick={runFeatureImportance}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Run Feature Importance
          </button>
        </div>
      )}

      {result && (
        <div className="mt-10 w-full max-w-xl">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Feature Importances</h2>
          <ul className="bg-gray-100 border rounded p-4">
            {typeof result === 'object' && !Array.isArray(result) ? (
              Object.entries(result)
                .sort((a, b) => {
                  const aVal = typeof a[1] === 'number' ? a[1] : -Infinity;
                  const bVal = typeof b[1] === 'number' ? b[1] : -Infinity;
                  return bVal - aVal;
                })
                .map(([key, value]) => (
                  <li key={key} className="py-1 border-b last:border-none">
                    <strong>{key}:</strong>{' '}
                    {typeof value === 'number' ? value.toFixed(4) : `⚠️ ${String(value)}`}
                  </li>
                ))
            ) : (
              <li className="text-red-600 font-semibold">
                ⚠️ Unexpected response: {JSON.stringify(result)}
              </li>
            )}
          </ul>
        </div>
      )}
    </main>
  );
}
