import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-data-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './data-privacy-policy.html',
  styleUrls: ['./data-privacy-policy.component.css']
})
export class DataPrivacyPolicy {}
