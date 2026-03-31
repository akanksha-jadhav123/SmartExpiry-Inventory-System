import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '../api/axiosConfig';
import '../App.css';

function ProductScanner({ onScanComplete, onClose }) {
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [cameraPermission, setCameraPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'
    const [foundProducts, setFoundProducts] = useState([]);
    const [showProductSelection, setShowProductSelection] = useState(false);
    const html5QrcodeScannerRef = useRef(null);

    // Check camera permissions and availability
    const checkCameraAvailability = useCallback(async () => {
        try {
            // Check if browser supports mediaDevices
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Check camera permissions
            if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                setCameraPermission(permissionStatus.state);
            }

            // Test camera access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment' // Prefer rear camera
                } 
            });
            
            // Stop the test stream immediately
            stream.getTracks().forEach(track => track.stop());
            
            return true;
        } catch (error) {
            console.error('Camera check failed:', error);
            handleCameraError(error);
            return false;
        }
    }, []);

    // Enhanced error handling
    const handleCameraError = (error) => {
        console.error('Camera Error:', error);
        
        let errorMessage = 'Camera Error: ';
        
        switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
                setCameraPermission('denied');
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                errorMessage = 'No camera found on your device.';
                break;
            case 'NotSupportedError':
                errorMessage = 'Camera not supported in this browser. Try Chrome or Firefox.';
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                errorMessage = 'Camera is already in use by another application.';
                break;
            case 'OverconstrainedError':
            case 'ConstraintNotSatisfiedError':
                errorMessage = 'No suitable camera found for scanning.';
                break;
            default:
                errorMessage = `Scanner error: ${error.message || 'Unknown error'}`;
        }
        
        setCameraError(errorMessage);
        setIsScanning(false);
    };

    // Extract expiry date from various barcode formats
    const extractExpiryFromBarcode = (barcodeText) => {
        console.log('Parsing barcode for expiry:', barcodeText);
        
        // 1. GS1 Barcode Format (most common for expiry dates)
        if (barcodeText.includes('(17)')) {
            const expiryMatch = barcodeText.match(/\(17\)(\d{6})/);
            if (expiryMatch) {
                const expiryStr = expiryMatch[1];
                // GS1 format: YYMMDD to YYYY-MM-DD
                const year = `20${expiryStr.substring(0, 2)}`;
                const month = expiryStr.substring(2, 4);
                const day = expiryStr.substring(4, 6);
                return `${year}-${month}-${day}`;
            }
        }

        // 2. AI (Application Identifier) format
        if (barcodeText.includes('17')) {
            const aiMatch = barcodeText.match(/17(\d{6})/);
            if (aiMatch) {
                const expiryStr = aiMatch[1];
                const year = `20${expiryStr.substring(0, 2)}`;
                const month = expiryStr.substring(2, 4);
                const day = expiryStr.substring(4, 6);
                return `${year}-${month}-${day}`;
            }
        }

        // 3. Simple date format (YYYYMMDD or YYMMDD)
        const simpleDateMatch = barcodeText.match(/(\d{6,8})/);
        if (simpleDateMatch) {
            const dateStr = simpleDateMatch[1];
            if (dateStr.length === 8) {
                // YYYYMMDD
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                return `${year}-${month}-${day}`;
            } else if (dateStr.length === 6) {
                // YYMMDD
                const year = `20${dateStr.substring(0, 2)}`;
                const month = dateStr.substring(2, 4);
                const day = dateStr.substring(4, 6);
                return `${year}-${month}-${day}`;
            }
        }

        // 4. JSON format with expiry field
        if (barcodeText.startsWith('{')) {
            try {
                const parsed = JSON.parse(barcodeText);
                if (parsed.expiry_date || parsed.expiry || parsed.expirationDate) {
                    return parsed.expiry_date || parsed.expiry || parsed.expirationDate;
                }
            } catch (e) {
                // Not valid JSON, continue to other formats
            }
        }

        // 5. CSV format (expiry in specific position)
        if (barcodeText.includes(',')) {
            const parts = barcodeText.split(',');
            // Try common positions for expiry date
            if (parts[2] && parts[2].match(/\d{4}-\d{2}-\d{2}/)) {
                return parts[2];
            } else if (parts[1] && parts[1].match(/\d{4}-\d{2}-\d{2}/)) {
                return parts[1];
            }
        }

        return null; // No expiry date found
    };

    // Prompt user to enter expiry date manually when barcode doesn't contain it
    const promptForExpiry = (barcodeText) => {
        const productName = prompt('Expiry date not found in barcode. Enter product name:', 'Scanned Product');
        if (productName) {
            let expiryDate;
            let validDate = false;
            
            while (!validDate) {
                expiryDate = prompt('Enter expiry date (YYYY-MM-DD):');
                if (!expiryDate) {
                    // User cancelled, close scanner
                    onClose();
                    return;
                }
                
                // Validate date format
                if (expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    validDate = true;
                } else {
                    alert('Please enter date in YYYY-MM-DD format');
                }
            }

            onScanComplete({
                name: productName,
                expiry_date: expiryDate,
                rawData: barcodeText,
                manualEntry: true
            });
        }
    };

    // Manual expiry entry only
    const handleManualExpiryEntry = () => {
        const productName = prompt('Enter product name:');
        if (productName) {
            let expiryDate;
            let validDate = false;
            
            while (!validDate) {
                expiryDate = prompt('Enter expiry date (YYYY-MM-DD):');
                if (!expiryDate) {
                    // User cancelled
                    return;
                }
                
                // Validate date format
                if (expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    validDate = true;
                } else {
                    alert('Please enter date in YYYY-MM-DD format');
                }
            }

            onScanComplete({
                name: productName,
                expiry_date: expiryDate,
                manualEntry: true
            });
        }
    };

    // Start scanner with enhanced error handling
    const startScanner = useCallback(async () => {
        setIsScanning(true);
        setCameraError(null);

        // Check camera availability first
        const isCameraAvailable = await checkCameraAvailability();
        if (!isCameraAvailable) {
            setIsScanning(false);
            return;
        }

        // Stop any existing scanner
        if (html5QrcodeScannerRef.current) {
            try {
                await html5QrcodeScannerRef.current.clear();
            } catch (error) {
                console.warn('Error clearing previous scanner:', error);
            }
        }

        // Function to be called when scan is successful
        const onScanSuccess = async (decodedText, decodedResult) => {
            console.log(`Scan result: ${decodedText}`, decodedResult);
            
            // Stop scanner immediately after successful scan
            if (html5QrcodeScannerRef.current) {
                html5QrcodeScannerRef.current.clear().catch(console.error);
            }
            
            setIsScanning(false);
            
            // First, try to find existing product in database
            try {
                const response = await api.post('/products/scan', {
                    scannedData: decodedText
                });
                
                const data = response.data;
                
                if (data.success && data.found && data.products.length > 0) {
                    // Product(s) found in database
                    if (data.products.length === 1) {
                        // Single product found - use it directly
                        const product = data.products[0];
                        onScanComplete({
                            id: product.id,
                            name: product.name,
                            expiry_date: product.expiry_date,
                            manufactured_date: product.manufactured_date,
                            retail_price: product.retail_price,
                            cost_price: product.cost_price,
                            quantity: product.quantity,
                            batch_no: product.batch_no,
                            category_id: product.category_id,
                            location_id: product.location_id,
                            category_name: product.category_name,
                            location_name: product.location_name,
                            days_until_expiry: product.days_until_expiry,
                            rawData: decodedText,
                            foundInDatabase: true,
                            allMatches: data.products
                        });
                        return;
                    } else {
                        // Multiple products found - show selection dialog
                        setFoundProducts(data.products);
                        setShowProductSelection(true);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error looking up product:', error);
            }
            
            // If no product found, try to parse as JSON or extract expiry date
            let parsedData = null;
            try {
                parsedData = JSON.parse(decodedText);
            } catch (e) {
                // Not JSON, continue with expiry extraction
            }
            
            if (parsedData) {
                // JSON data found - return it for parsing
                onScanComplete({
                    rawData: decodedText,
                    foundInDatabase: false,
                    isJSON: true
                });
            } else {
                // Try to extract expiry date from barcode
                const expiryDate = extractExpiryFromBarcode(decodedText);
                
                if (expiryDate) {
                    // If expiry date found, complete with just the expiry
                    onScanComplete({
                        expiry_date: expiryDate,
                        rawData: decodedText,
                        hasExpiry: true,
                        foundInDatabase: false
                    });
                } else {
                    // If no expiry found, ask for manual expiry entry
                    promptForExpiry(decodedText);
                }
            }
        };

        // Function to handle scan errors
        const onScanFailure = (error) => {
            if (!error.includes('NotFoundException')) {
                console.warn('Scan error:', error);
            }
        };

        // Initialize scanner with better configuration
        try {
            html5QrcodeScannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 150 }, // Smaller for better performance
                    supportedScanTypes: [
                        Html5QrcodeScanType.SCAN_TYPE_CAMERA
                    ],
                    rememberLastUsedCamera: true,
                    showTorchButtonIfSupported: true,
                    showZoomSliderIfSupported: true
                },
                false // verbose
            );

            await html5QrcodeScannerRef.current.render(onScanSuccess, onScanFailure);
            
        } catch (error) {
            console.error('Scanner initialization error:', error);
            handleCameraError(error);
            setIsScanning(false);
        }
    }, [onScanComplete, onClose, checkCameraAvailability]);

    // Stop scanner
    const stopScanner = useCallback(async () => {
        if (html5QrcodeScannerRef.current) {
            try {
                await html5QrcodeScannerRef.current.clear();
            } catch (error) {
                console.error("Failed to clear scanner:", error);
            }
            html5QrcodeScannerRef.current = null;
        }
        setIsScanning(false);
    }, []);

    // Test scanner with a simple camera check
    const testScanner = async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            stream.getTracks().forEach(track => track.stop());
            setCameraError('Camera test successful! Click "Start Scanner" to begin.');
        } catch (error) {
            handleCameraError(error);
        }
    };

    // Auto-start scanner when component mounts
    useEffect(() => {
        startScanner();

        return () => {
            stopScanner();
        };
    }, [startScanner, stopScanner]);

    // Instructions for fixing camera issues
    const renderCameraHelp = () => {
        if (!cameraError) return null;

        return (
            <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--error-red)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1rem',
                textAlign: 'center'
            }}>
                <strong>{cameraError}</strong>
                
                <div style={{ 
                    marginTop: '0.75rem', 
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.5)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Quick fixes:</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        <li>Allow camera permissions in browser settings</li>
                        <li>Refresh the page and try again</li>
                        <li>Ensure no other app is using the camera</li>
                        <li>Try using Chrome or Firefox</li>
                        <li>Check if your device has a working camera</li>
                    </ul>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                        className="btn btn-outline btn-sm"
                        onClick={startScanner}
                    >
                        🔄 Retry Camera
                    </button>
                    
                    <button 
                        className="btn btn-outline btn-sm"
                        onClick={testScanner}
                    >
                        🧪 Test Scanner
                    </button>

                    <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            setCameraError(null);
                            handleManualExpiryEntry();
                        }}
                    >
                        ⌨️ Manual Entry
                    </button>
                </div>
            </div>
        );
    };

    // Handle product selection from multiple matches
    const handleProductSelect = (product) => {
        onScanComplete({
            id: product.id,
            name: product.name,
            expiry_date: product.expiry_date,
            manufactured_date: product.manufactured_date,
            retail_price: product.retail_price,
            cost_price: product.cost_price,
            quantity: product.quantity,
            batch_no: product.batch_no,
            category_id: product.category_id,
            location_id: product.location_id,
            category_name: product.category_name,
            location_name: product.location_name,
            days_until_expiry: product.days_until_expiry,
            foundInDatabase: true,
            selectedFromMultiple: true
        });
        setShowProductSelection(false);
        setFoundProducts([]);
    };

    // Format currency for display
    const formatCurrency = (amount) => {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    // Format expiry status
    const getExpiryStatus = (daysUntilExpiry) => {
        if (daysUntilExpiry === null) return { text: 'No expiry date', color: 'var(--gray-500)' };
        if (daysUntilExpiry < 0) {
            return { text: `Expired ${Math.abs(daysUntilExpiry)} days ago`, color: 'var(--error-red)' };
        } else if (daysUntilExpiry <= 7) {
            return { text: `Expires in ${daysUntilExpiry} days`, color: 'var(--error-red)' };
        } else if (daysUntilExpiry <= 30) {
            return { text: `Expires in ${daysUntilExpiry} days`, color: 'var(--warning-amber)' };
        } else {
            return { text: `Expires in ${daysUntilExpiry} days`, color: 'var(--success-emerald)' };
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: showProductSelection ? '600px' : '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {showProductSelection ? '📦 Select Product' : '📅 Scan Product'}
                    </h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="scanner-body" style={{ padding: '1.5rem' }}>
                    {renderCameraHelp()}

                    <div 
                        id="qr-reader" 
                        style={{ 
                            width: '100%', 
                            minHeight: '300px',
                            border: cameraError ? '2px dashed var(--gray-300)' : 'none',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden'
                        }}
                    ></div>

                    {!cameraError && (
                        <div style={{ 
                            background: 'var(--gray-50)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            margin: '1.5rem 0',
                            border: '1px solid var(--gray-200)'
                        }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>
                                📋 Scanning Instructions
                            </h4>
                            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--primary-blue)' }}>•</span>
                                    <span>Point camera at GS1, QR, or barcodes with expiry information</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--primary-blue)' }}>•</span>
                                    <span>Most pharmaceutical and food products contain expiry dates</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--primary-blue)' }}>•</span>
                                    <span>Ensure good lighting and steady hands for better scanning</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--primary-blue)' }}>•</span>
                                    <span>If no expiry found, you'll be prompted to enter it manually</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showProductSelection && (
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {isScanning ? (
                                <button 
                                    className="btn btn-warning"
                                    onClick={stopScanner}
                                >
                                    <span>⏹️</span>
                                    Stop Scanner
                                </button>
                            ) : (
                                <button 
                                    className="btn btn-primary"
                                    onClick={startScanner}
                                    disabled={cameraPermission === 'denied'}
                                >
                                    <span>🎥</span>
                                    Start Scanner
                                </button>
                            )}

                            <button 
                                className="btn btn-outline"
                                onClick={handleManualExpiryEntry}
                            >
                                <span>⌨️</span>
                                Manual Entry
                            </button>

                            <button 
                                className="btn btn-ghost"
                                onClick={onClose}
                            >
                                <span>❌</span>
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Product Selection Dialog */}
                    {showProductSelection && foundProducts.length > 0 && (
                        <div style={{
                            background: 'var(--gray-50)',
                            border: '1px solid var(--gray-200)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.5rem',
                            marginTop: '1rem'
                        }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>
                                📦 Multiple Products Found - Select One:
                            </h4>
                            
                            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {foundProducts.map((product, index) => {
                                    const expiryStatus = getExpiryStatus(product.days_until_expiry);
                                    return (
                                        <div 
                                            key={product.id}
                                            onClick={() => handleProductSelect(product)}
                                            style={{
                                                background: 'white',
                                                border: '1px solid var(--gray-200)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                ':hover': {
                                                    borderColor: 'var(--primary-blue)',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.borderColor = 'var(--primary-blue)';
                                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.borderColor = 'var(--gray-200)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--gray-800)', marginBottom: '0.25rem' }}>
                                                        {product.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                                                        ID: {product.id} | Batch: {product.batch_no || 'N/A'}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--success-emerald)' }}>
                                                        {formatCurrency(product.retail_price)}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                                        Qty: {product.quantity}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.8rem', color: expiryStatus.color, fontWeight: '500' }}>
                                                    {expiryStatus.text}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                                    {product.category_name && `${product.category_name}`}
                                                    {product.location_name && ` • ${product.location_name}`}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                                <button 
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setShowProductSelection(false);
                                        setFoundProducts([]);
                                    }}
                                >
                                    ❌ Cancel Selection
                                </button>
                                <button 
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setShowProductSelection(false);
                                        setFoundProducts([]);
                                        handleManualExpiryEntry();
                                    }}
                                >
                                    ➕ Add New Product
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductScanner;