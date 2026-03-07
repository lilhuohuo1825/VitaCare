import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-policy.html',
  styleUrls: ['./payment-policy.component.css']
})
export class PaymentPolicy {}
