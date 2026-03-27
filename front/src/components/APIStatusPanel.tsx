import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { testPDFExtractionAPI, quickConnectivityTest, APITestResult, displayTestReport } from '../utils/apiTester';

const RENDER_API_URL = 'https://pdf-extractor-n9q0.onrender.com';
const LOCAL_API_URL = 'http://localhost:5678';

export const APIStatusPanel: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [testResult, setTestResult] = useState<APITestResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const [renderStatus, setRenderStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [localStatus, setLocalStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Test initial au chargement
  useEffect(() => {
    runQuickTest();
    checkIndividualAPIs();
  }, []);

  const checkIndividualAPIs = async () => {
    // Test Render API
    try {
      const renderResponse = await fetch(`${RENDER_API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      setRenderStatus(renderResponse.ok ? 'available' : 'unavailable');
    } catch (error) {
      setRenderStatus('unavailable');
    }

    // Test Local API
    try {
      const localResponse = await fetch(`${LOCAL_API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      setLocalStatus(localResponse.ok ? 'available' : 'unavailable');
    } catch (error) {
      setLocalStatus('unavailable');
    }
  };

  const runQuickTest = async () => {
    setApiStatus('checking');
    const isAvailable = await quickConnectivityTest();
    setApiStatus(isAvailable ? 'available' : 'unavailable');
    setLastTestTime(new Date());
  };

  const runFullTest = async () => {
    setIsRunningTest(true);
    setApiStatus('checking');
    
    try {
      const result = await testPDFExtractionAPI();
      setTestResult(result);
      setApiStatus(result.isAvailable ? 'available' : 'unavailable');
      setLastTestTime(new Date());
      
      // Affiche le rapport dans la console
      displayTestReport(result);
      
    } catch (error) {
      console.error('Erreur lors du test complet:', error);
      setApiStatus('unavailable');
    } finally {
      setIsRunningTest(false);
    }
  };

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'available':
        return <Wifi className="w-5 h-5 text-green-600" />;
      case 'unavailable':
        return <WifiOff className="w-5 h-5 text-red-600" />;
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'available':
        return 'bg-green-50 border-green-200';
      case 'unavailable':
        return 'bg-red-50 border-red-200';
      case 'checking':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'available':
        return 'API Python Active';
      case 'unavailable':
        return 'API Python Indisponible';
      case 'checking':
        return 'Vérification...';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'poor':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Statut API d'Extraction</h3>
        <button
          onClick={runQuickTest}
          disabled={apiStatus === 'checking'}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Actualiser le statut"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${apiStatus === 'checking' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Statut Principal */}
      <motion.div
        className={`p-4 rounded-lg border ${getStatusColor()} mb-4`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium text-gray-900">{getStatusText()}</p>
              <p className="text-sm text-gray-600">
                {apiStatus === 'available' && 'Extraction haute qualité disponible'}
                {apiStatus === 'unavailable' && 'Utilisation du mode local (PDF.js)'}
                {apiStatus === 'checking' && 'Test de connectivité en cours...'}
              </p>
            </div>
          </div>
          {lastTestTime && (
            <div className="text-xs text-gray-500">
              Testé à {lastTestTime.toLocaleTimeString('fr-FR')}
            </div>
          )}
        </div>

        {/* Status détaillé des APIs */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Status détaillé des APIs</h4>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                renderStatus === 'available' ? 'bg-green-500' :
                renderStatus === 'unavailable' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-700">Render (Cloud)</span>
            </div>
            <span className="text-xs text-gray-500">
              {renderStatus === 'available' ? '✅ Actif' :
               renderStatus === 'unavailable' ? '❌ Inactif' : '⏳ Test...'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                localStatus === 'available' ? 'bg-green-500' :
                localStatus === 'unavailable' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-700">Local (Port 5678)</span>
            </div>
            <span className="text-xs text-gray-500">
              {localStatus === 'available' ? '✅ Actif' :
               localStatus === 'unavailable' ? '❌ Inactif' : '⏳ Test...'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Résultats du Test Complet */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 mb-4"
        >
          <h4 className="text-sm font-medium text-gray-900">Résultats du Test Complet</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Temps de Réponse</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{testResult.responseTime}ms</p>
            </div>
            
            {testResult.extractionQuality && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  {getQualityIcon(testResult.extractionQuality)}
                  <span className="text-sm font-medium text-gray-900">Qualité</span>
                </div>
                <p className="text-sm font-medium capitalize">
                  {testResult.extractionQuality === 'excellent' && '🟢 Excellente'}
                  {testResult.extractionQuality === 'good' && '🟡 Bonne'}
                  {testResult.extractionQuality === 'poor' && '🟠 Limitée'}
                  {testResult.extractionQuality === 'failed' && '🔴 Échec'}
                </p>
              </div>
            )}
          </div>
          
          {testResult.textLength !== undefined && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Texte extrait:</strong> {testResult.textLength} caractères
              </p>
            </div>
          )}
          
          {testResult.error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Erreur:</strong> {testResult.error}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={runFullTest}
          disabled={isRunningTest}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isRunningTest ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Test en cours...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Lancer Test Complet</span>
            </>
          )}
        </button>
        
        <button
          onClick={checkIndividualAPIs}
          className="w-full py-2 px-4 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Actualiser le statut des APIs
        </button>
        
        {apiStatus === 'unavailable' && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <h4 className="text-sm font-medium text-yellow-900 mb-1">Dépannage</h4>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• Vérifiez que votre script Python est en cours d'exécution</li>
              <li>• Confirmez que le port 5678 est accessible</li>
              <li>• Redémarrez le script Python si nécessaire</li>
              <li>• L'API Render peut prendre 1-2 minutes à se réveiller</li>
              <li>• Vérifiez les logs de votre serveur Python</li>
            </ul>
          </div>
        )}
      </div>

      {/* Informations Techniques */}
      {testResult?.testDetails && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
            Détails Techniques
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono">
            <div><strong>Endpoint:</strong> {testResult.testDetails.endpoint}</div>
            <div><strong>Méthode:</strong> {testResult.testDetails.method}</div>
            <div><strong>Statut HTTP:</strong> {testResult.testDetails.status}</div>
            <div><strong>Headers:</strong></div>
            <pre className="mt-1 text-xs overflow-x-auto">
              {JSON.stringify(testResult.testDetails.headers, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
};