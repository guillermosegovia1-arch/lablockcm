'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Users,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    processFile(droppedFile);
  };

  const processFile = async (f: File) => {
    setFile(f);
    setError(null);
    setResult(null);

    try {
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (json.length === 0) {
        setError('El archivo seleccionado no contiene datos.');
        setPreviewRows([]);
        return;
      }

      setPreviewRows(json.slice(0, 15)); // Previsualizar primeras 15 filas
    } catch (err: any) {
      setError('Error al leer el archivo Excel: ' + err.message);
    }
  };

  const handleImportSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/import-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Error al procesar la importación.');
      }
    } catch (err: any) {
      setError('Error en la comunicación con el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nombre Completo': 'Juan Pérez Ramos',
        'Rol': 'alumno',
        'PIN': '',
      },
      {
        'Nombre Completo': 'Ana Morales Ruiz',
        'Rol': 'alumno',
        'PIN': '',
      },
      {
        'Nombre Completo': 'Prof. Manuel Hernández',
        'Rol': 'maestro',
        'PIN': '1234',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos_Maestros');
    XLSX.writeFile(workbook, 'Plantilla_LabLock_ColegioMexicano.xlsx');
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            <span>Carga Masiva de Alumnos y Docentes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Importa la lista escolar de matrículas desde hojas de cálculo Excel (.xlsx) o archivos .csv
          </p>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Descargar Plantilla Excel</span>
        </button>
      </div>

      {/* Guide Card */}
      <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-3.5 text-xs text-blue-200">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Requisitos de Columnas en el Excel:</p>
          <p>
            El archivo debe incluir la columna principal <span className="font-mono bg-blue-900/50 px-1.5 py-0.5 rounded text-white font-bold">Nombre Completo</span>. Opcionalmente puedes agregar{' '}
            <span className="font-mono bg-blue-900/50 px-1.5 py-0.5 rounded text-white">Rol</span> (alumno / maestro) y{' '}
            <span className="font-mono bg-blue-900/50 px-1.5 py-0.5 rounded text-white">PIN</span>.
          </p>
          <p className="text-blue-300">
            * Si un nombre completo ya existe en el sistema, sus datos se actualizarán automáticamente sin duplicarse.
          </p>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-3xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 transition-all cursor-pointer relative"
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {file ? file.name : 'Arrastra tu archivo Excel aquí o haz clic para explorar'}
          </h3>
          <p className="text-xs text-slate-400">
            Formatos compatibles: .xlsx, .xls, .csv (tamaño máx: 15MB)
          </p>
          {file && (
            <div className="mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Archivo cargado ({Math.round(file.size / 1024)} KB)</span>
            </div>
          )}
        </div>
      </div>

      {/* Error or Success notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{result.message}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs pt-2">
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20">
              <span className="text-slate-400 block">Nuevos Alumnos:</span>
              <span className="text-lg font-bold text-emerald-400">{result.inserted}</span>
            </div>
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20">
              <span className="text-slate-400 block">Actualizados:</span>
              <span className="text-lg font-bold text-blue-400">{result.updated}</span>
            </div>
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20">
              <span className="text-slate-400 block">Filas con Error:</span>
              <span className="text-lg font-bold text-amber-400">{result.errors}</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {previewRows.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Vista Previa de Registros Detectados (Primeros {previewRows.length})</span>
            </h3>

            <button
              onClick={handleImportSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Importando a Base de Datos...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Confirmar e Importar al Sistema</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">#</th>
                  {Object.keys(previewRows[0] || {}).map((col) => (
                    <th key={col} className="py-3 px-4 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                    {Object.values(row).map((val: any, cidx) => (
                      <td key={cidx} className="py-2.5 px-4 text-slate-200">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
