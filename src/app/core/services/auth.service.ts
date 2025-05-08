import { Injectable } from '@angular/core';
import { getFirebaseBackend } from '../../authUtils';
import { User } from '../models/auth.models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import { GlobalComponent } from "../../global-component";
import {environment} from "../../../environments/environment"

const AUTH_API = GlobalComponent.AUTH_API;

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

@Injectable({ providedIn: 'root' })

/**
 * Auth-service Component
 */
export class AuthenticationService {

    user!: User;
    currentUserValue: any;
    private currentUserSubject: BehaviorSubject<User>;

    constructor(private http: HttpClient) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')!));
     }

    /**
     * Performs the register
     * @param email email
     * @param password password
     */
     register(email: string, first_name: string, password: string) {
        // return getFirebaseBackend()!.registerUser(email, password).then((response: any) => {
        //     const user = response;
        //     return user;
        // });

        // Register Api
        return this.http.post(AUTH_API + 'signup', {
            email,
            first_name,
            password,
          }, httpOptions);
    }

    /**
     * Performs the auth login using NIK and password
     * @param nik NIK of user
     * @param password password of user
     */
    login(nik: string, password: string): Observable<any> { // Changed parameter name and added return type

        // make a bypass nik = 123 pass = qwe
        if (nik === '123' && password === 'qwe') {
            const user = {
                lg_nik: nik,
                lg_password: password,
                lg_name: 'testing',
                token: 'test'
            }
            return new Observable(observer => {
                observer.next({
                    data:
                    {
                        user,
                        token: 'test'
                    },
                });
                observer.complete();
            });
        }
        
        // Define the specific login URL
        const loginUrl = environment.baseApi + '/auth/login'; // Use http:// if not HTTPS

        // Define the request body with the required field names
        const body = {
            lg_nik: nik,
            lg_password: password
        };

        // Make the POST request
        return this.http.post<any>(loginUrl, body, httpOptions); // Specify expected response type if known
    }

    /**
     * Returns the current user
     */
    public currentUser(): any {
        // This likely needs updating if you are not using Firebase anymore
        // Consider returning the value from localStorage or the BehaviorSubject
        // return getFirebaseBackend()!.getAuthenticatedUser();
        return this.currentUserSubject.value; // Example: return from BehaviorSubject
    }

    /**
     * Logout the user
     */
    logout() {
        // Clear local storage and update BehaviorSubject
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        this.currentUserSubject.next(null!);
        // Optional: Add API call to invalidate token on the server if needed
    }

    /**
     * Reset password
     * @param email email
     */
    resetPassword(email: string) {
        return getFirebaseBackend()!.forgetPassword(email).then((response: any) => {
            const message = response.data;
            return message;
        });
    }

}

