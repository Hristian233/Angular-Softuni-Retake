import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { AuthData } from './auth-data.model';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private isAuthenticated = false;
    private token:string;
    private authStatusListener = new Subject<boolean>();
    private userId: string;
    private loggedInUser;

    private tokenTimer: any;
    constructor (private http: HttpClient,private router:Router){}

    getToken(){
        return this.token;
    }

    getIsAuth(){
        return this.isAuthenticated
    }

    getAuthStatusListener(){
        return this.authStatusListener.asObservable();
    }

    createUser(email: string, password: string){
        const authData: AuthData = {email: email, password: password};
        return this.http.post('http://localhost:3000/api/user/signup', authData)
            .subscribe(()=>{
                this.router.navigate['/'];
            }, error => {
                this.authStatusListener.next(false);
            });
    }

    login(email: string, password: string){
        const authData: AuthData = {email: email, password: password};
        this.http.post<{token:string, user:any, expiresIn: number, userId: string}>
        ('http://localhost:3000/api/user/login', authData)
            .subscribe(response =>{
                const token = response.token;
                this.token = token;
                if(token) {
                    const expiresInDuration = response.expiresIn;
                    this.setAuthTimer(expiresInDuration);
                    this.isAuthenticated = true;
                    this.userId = response.userId;
                    this.authStatusListener.next(true);
                    const now = new Date();
                    const expirationDate = new Date(now.getTime() + expiresInDuration * 1000);
                    console.log(expirationDate);
                    this.saveAuthData(token, expirationDate, this.userId);
                    this.router.navigate(["/"]);
                }
                this.authStatusListener.next(true);
                sessionStorage.setItem('currentUser', JSON.stringify(response.user))
                this.router.navigate(['/']);
            }, error => {
                this.authStatusListener.next(false);
            });
    }

    private setAuthTimer(duration: number) {
        console.log("Setting timer: " + duration);
        this.tokenTimer = setTimeout(() => {
          this.logout();
        }, duration * 1000);
      }

      private saveAuthData(token: string, expirationDate: Date, userId: string) {
        localStorage.setItem("token", token);
        localStorage.setItem("expiration", expirationDate.toISOString());
        localStorage.setItem("userId", userId);
      }

    getCurrentUser(){
        return sessionStorage.getItem('currentUser');
    }

    getUserId() {
        return this.userId;
      }

    autoAuthUser() {
        const authInformation = this.getAuthData();
        if (!authInformation) {
          return;
        }
        const now = new Date();
        const expiresIn = authInformation.expirationDate.getTime() - now.getTime();
        if (expiresIn > 0) {
          this.token = authInformation.token;
          this.isAuthenticated = true;
          this.userId = authInformation.userId;
          this.setAuthTimer(expiresIn / 1000);
          this.authStatusListener.next(true);
        }
      }

      private clearAuthData() {
        localStorage.removeItem("token");
        localStorage.removeItem("expiration");
        localStorage.removeItem("userId");
      }

      private getAuthData() {
        const token = localStorage.getItem("token");
        const expirationDate = localStorage.getItem("expiration");
        const userId = localStorage.getItem("userId");
        if (!token || !expirationDate) {
          return;
        }
        return {
          token: token,
          expirationDate: new Date(expirationDate),
          userId: userId
        }
      }


    logout(){
        this.token = null;
        this.isAuthenticated = false;
        this.authStatusListener.next(false);
        clearTimeout(this.tokenTimer);
        this.clearAuthData();
        sessionStorage.clear();
        this.userId = null;
        this.router.navigate(['/']);
    }

    getAllUsers(){
       return this.http.get('http://localhost:3000/api/user/all');

    }
}