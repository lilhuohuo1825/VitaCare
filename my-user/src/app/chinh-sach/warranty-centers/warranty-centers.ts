import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-warranty-centers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './warranty-centers.html',
  styleUrls: ['./warranty-centers.component.css']
})
export class WarrantyCenters {}
