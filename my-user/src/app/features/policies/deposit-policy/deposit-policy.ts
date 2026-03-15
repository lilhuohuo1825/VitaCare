import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-deposit-policy',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './deposit-policy.html',
    styleUrls: ['./deposit-policy.component.css']
})
export class DepositPolicy {
}
