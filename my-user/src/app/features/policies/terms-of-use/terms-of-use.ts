import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms-of-use',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms-of-use.html',
  styleUrls: ['./terms-of-use.component.css']
})
export class TermsOfUse {}
