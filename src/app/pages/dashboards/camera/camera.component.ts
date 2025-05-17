import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ToastService } from './toast-service';

import { circle, latLng, tileLayer } from 'leaflet';
import { SwiperOptions } from 'swiper';

import { BestSelling, TopSelling, RecentSelling, statData } from './data';
import { ChartType } from './dashboard.model';
import { finalize, Observable, Subject } from 'rxjs';
import { DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

// Define an interface for the expected scan result structure
interface ScanResult {
  id: number;
  formatted_top: string;
  formatted_bottom: string;
  category: string;
  status: string;
  message: string;
}

// Define an interface for the available lot data
interface AvailableLot {
  category: string;
  top_text: string;
  bottom_text: string;
  is_verified: boolean;
  document_number: string;
  issued_date: string; // Assuming date is a string, adjust if it's a Date object
}


@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.scss']
})

/**
 * Camera Component
 */
export class CameraComponent implements OnInit, OnDestroy {

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  analyticsChart!: ChartType;
  BestSelling: any;
  TopSelling: any;
  RecentSelling: any;
  SalesCategoryChart!: ChartType;
  statData!: any;


  // Add properties for the available lots table
  public availableLots: AvailableLot[] = [];
  public loadingLots: boolean = false;
  public lotsError: string | null = null;
  private base_url:string = environment.baseApi;

  // Current Date
  currentDate: any;

  // Camera properties
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  public showWebcam = true;
  public stream: MediaStream | null = null;
  public cameraError: string | null = null;
  public facingMode: string = 'environment';
  public videoWidth = 320;
  public videoHeight = 427;
  public capturedImage: string | null = null;
  // Add properties to track actual image dimensions
  public actualWidth: number = 0;
  public actualHeight: number = 0;

  // File upload properties
  public showFileUpload = false;
  public uploadedImage: string | null = null;
  public dropzoneConfig: DropzoneConfigInterface = {
    url: 'https://httpbin.org/post',
    maxFilesize: 10,
    acceptedFiles: 'image/*',
    addRemoveLinks: true,
    autoProcessQueue: false,
    createImageThumbnails: true
  };

  public loading: boolean = false;
  public verifying: boolean = false;

  // Add property to store OCR results
  public ocrResult: ScanResult | null = null;

  constructor(public toastService: ToastService, private http: HttpClient) {
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    this.currentDate = { from: firstDay, to: lastDay };
  }

  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'Dashboards' },
      { label: 'Document Scanner', active: true }
    ];

    // Start camera when component initializes
    setTimeout(() => {
      this.startCamera();
    }, 500);

    if (localStorage.getItem('toast')) {
      this.toastService.show('Logged in Successfull.', { classname: 'bg-success text-center text-white', delay: 5000 });
      localStorage.removeItem('toast');
    }

    // Fetch available lots when the component initializes
    this.fetchAvailableLots();
  }
  public fetchAvailableLots(): void {
    this.loadingLots = true; // Start loading state for the table
    this.lotsError = null;   // Clear previous errors

    const apiUrl = this.base_url + '/product-batch/available';
    const token = localStorage.getItem('token');

    if (!token) {
      this.lotsError = 'Authentication token not found. Please log in.';
      this.loadingLots = false;
      this.toastService.show(this.lotsError, { classname: 'bg-danger text-center text-white', delay: 5000 });
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `${token}` // Assuming Bearer token scheme
    });

    this.http.get<any>(apiUrl, { headers }) // Assuming the API returns { status: ..., data: AvailableLot[], message: ... }
      .pipe(
        finalize(() => {
          this.loadingLots = false; // Stop loading state for the table
        })
      )
      .subscribe({
        next: (response) => {
          if (response && response.status === 200 && Array.isArray(response.data)) {
            this.availableLots = response.data;
          } else {
            this.lotsError = response?.message || 'Failed to fetch available lots or invalid data format.';
            this.availableLots = []; // Clear any previous data
            this.toastService.show(`${this.lotsError}`, { classname: 'bg-warning text-center text-white', delay: 5000 });
          }
        },
        error: (error) => {
          console.error('API Error fetching available lots:', error);
          this.lotsError = error?.error?.message || error?.message || 'An error occurred while fetching available lots.';
          this.availableLots = []; // Clear any previous data
          this.toastService.show(`Error: ${this.lotsError}`, { classname: 'bg-danger text-center text-white', delay: 5000 });
        }
      });
  }


  ngOnDestroy(): void {
    // Stop the camera stream when component is destroyed
    this.stopCamera();
  }

  /**
   * Start the camera stream
   */
  public startCamera(): void {
    this.cameraError = null;
    this.capturedImage = null;
    
    const constraints: any = {
      video: {
        facingMode: this.facingMode,
        focusMode: 'continuous',
        width: { ideal: 1440 },
        height: { ideal: 1920 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        this.stream = stream;
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream;
          this.videoElement.nativeElement.play();
          this.showWebcam = true;
        }
      })
      .catch((err) => {
        console.error('Error accessing camera:', err);
        this.cameraError = `Camera error: ${err.message || 'Could not access camera'}`;
        this.toastService.show(this.cameraError, { classname: 'bg-danger text-center text-white', delay: 5000 });
      });
  }

  /**
   * Stop the camera stream
   */
  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    
    if (this.videoElement && this.videoElement.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  /**
   * Toggle camera facing mode (front/back)
   */
  public toggleCameraFacing(): void {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.stopCamera();
    this.startCamera();
  }

  /**
   * Capture a photo from the video stream
   */
  public capturePhoto(): void {
    if (!this.videoElement || !this.canvasElement || !this.stream) {
      this.toastService.show('Camera is not ready', { classname: 'bg-warning text-center text-white', delay: 3000 });
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    
    // Set canvas dimensions to match the actual video dimensions
    // This ensures we capture at the camera's native resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Store the actual dimensions for reference
    this.actualWidth = video.videoWidth;
    this.actualHeight = video.videoHeight;
    
    // Draw the current video frame to the canvas at full resolution
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL at full quality
      this.capturedImage = canvas.toDataURL('image/png');
      
      console.log(`Captured image at ${canvas.width}x${canvas.height}`);
    }
  }

  /**
   * Handle successful file upload
   */
  public onUploadSuccess(event: any): void {
    const [file, response] = event;
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      this.uploadedImage = e.target.result;
      this.toastService.show('File uploaded successfully', 
        { classname: 'bg-success text-center text-white', delay: 3000 });
    };
    
    reader.readAsDataURL(file);
  }
  private dataURItoBlob(dataURI: string): Blob | null {
    try {
      // convert base64 to raw binary data held in a string
      const byteString = atob(dataURI.split(',')[1]);

      // separate out the mime component
      const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

      // write the bytes of the string to an ArrayBuffer
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      return new Blob([ab], { type: mimeString });
    } catch (e) {
      console.error("Error converting data URI to Blob:", e);
      return null;
    }
  }

  /**
   * Handle file upload error
   */
  public onUploadError(event: any): void {
    this.toastService.show('Error uploading file: ' + event[1], 
      { classname: 'bg-danger text-center text-white', delay: 5000 });
  }

  /**
   * Clear uploaded image
   */
  public clearUploadedImage(): void {
    this.uploadedImage = null;
  }

  /**
   * Process image with OCR
   */
  public processWithOCR(): void {
    let imageBlob: Blob | null = null;
    let fileName = 'capture.png'; // Default filename

    // Determine the image source and convert to Blob
    if (this.capturedImage) {
      imageBlob = this.dataURItoBlob(this.capturedImage);
      fileName = `webcam_${Date.now()}.png`;
    } else if (this.uploadedImage) {
      imageBlob = this.dataURItoBlob(this.uploadedImage);
      fileName = `upload_${Date.now()}.png`;
    } else {
      this.toastService.show('No image available for processing',
        { classname: 'bg-warning text-center text-white', delay: 3000 });
      return;
    }

    if (!imageBlob) {
      this.toastService.show('Could not convert image data',
        { classname: 'bg-danger text-center text-white', delay: 3000 });
      return;
    }

    // Clear previous results before processing
    this.ocrResult = null;

    // Set loading state
    this.loading = true;
    this.toastService.show('Processing image...',
      { classname: 'bg-info text-center text-white', delay: 10000 });

    // Prepare FormData
    const formData = new FormData();
    formData.append('photo', imageBlob, fileName);

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      this.toastService.show('Authentication token not found. Please log in.',
        { classname: 'bg-danger text-center text-white', delay: 5000 });
      this.loading = false;
      // Optionally redirect to login
      // this.router.navigate(['/auth/login']);
      return;
    }

    // Prepare Headers
    const headers = new HttpHeaders({
      'Authorization': `${token}` // Added Bearer prefix back, adjust if your backend doesn't need it
      // Content-Type is automatically set by HttpClient when using FormData
    });

    // API Endpoint
    const apiUrl = this.base_url + '/capture'; // Adjusted API endpoint back

    // Make the POST request
    this.http.post<any>(apiUrl, formData, { headers })
      .pipe(
        finalize(() => {
          this.loading = false; // Ensure loading is set to false when request completes or errors
        })
      )
      .subscribe({
        next: (response:any) => {
          console.log('OCR API Response:', response);
          // Check for successful response and expected data structure
          if (response && response.status === 200 && response.data && response.data.scan_result) {
            this.ocrResult = response.data.scan_result; // Store the result
            console.log('OCR Result:', this.ocrResult);
            const message = response?.message || 'Processing successful!';
            this.toastService.show(message,
              { classname: 'bg-success text-center text-white', delay: 5000 });
          } else {
            // Handle cases where API call succeeded but didn't return expected data
            const message = response?.message || 'Processing completed, but no valid result found.';
            this.toastService.show(message,
              { classname: 'bg-warning text-center text-white', delay: 5000 });
            this.ocrResult = null; // Ensure result is null if data is not as expected
          }
        },
        error: (error) => {
          console.error('OCR API Error:', error);
          this.ocrResult = null; // Clear result on error
          // Handle error response
          const errorMessage = error?.error?.message || error?.message || 'An error occurred during processing.';
          this.toastService.show(`Error: ${errorMessage}`,
            { classname: 'bg-danger text-center text-white', delay: 5000 });
        }
      });
  }
  public verifyResult(): void {
    if (!this.ocrResult) {
      this.toastService.show('No OCR result available to verify.',
        { classname: 'bg-warning text-center text-white', delay: 3000 });
      return;
    }

    // Set verifying state
    this.verifying = true;
    this.toastService.show('Verifying result...',
      { classname: 'bg-info text-center text-white', delay: 5000 });

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      this.toastService.show('Authentication token not found. Please log in.',
        { classname: 'bg-danger text-center text-white', delay: 5000 });
      this.verifying = false;
      // Optionally redirect to login
      // this.router.navigate(['/auth/login']);
      return;
    }

    // Prepare Headers
    const headers = new HttpHeaders({
      'Authorization': `${token}`, // Assuming Bearer token scheme
      'Content-Type': 'application/json' // Sending JSON data
    });

    // Verification API Endpoint (Update this URL)
    const verifyUrl = this.base_url + '/verify';

    const ocr_result_id = this.ocrResult.id; // Assuming the ID is available in the OCR result
    const category_name = this.ocrResult.category; // Assuming the category_name is available in the OCR result

    // Make the POST request - sending the ocrResult data
    this.http.post<any>(verifyUrl, {ocr_result_id,category_name}, { headers })
      .pipe(
        finalize(() => {
          this.verifying = false; // Ensure verifying is set to false on completion/error
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Verification API Response:', response);
          // Handle successful verification response
          const message = response?.message || 'Verification successful!';
          this.toastService.show(message,
            { classname: 'bg-success text-center text-white', delay: 5000 });
          // Optionally: Clear results or navigate away after successful verification
          // this.ocrResult = null;
          // this.webcamImage = undefined;
          // this.uploadedImage = null;
          // this.router.navigate(['/some-other-page']);
        },
        error: (error) => {
          console.error('Verification API Error:', error);
          // Handle error response

          const errorMessage = error;
          this.toastService.show(`Verification Failed: ${errorMessage}`,
            { classname: 'bg-danger text-center text-white', delay: 5000 });
        }
      });
  }


  /**
   * Retake photo
   */
  public retakePhoto(): void {
    this.capturedImage = null;
    this.uploadedImage = null;
    this.ocrResult = null;
    this.showWebcam = true;
    
    // Restart the camera if it was stopped
    if (!this.stream) {
      this.startCamera();
    }
  }
}
