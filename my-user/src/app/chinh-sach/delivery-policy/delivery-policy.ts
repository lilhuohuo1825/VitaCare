import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-delivery-policy',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './delivery-policy.html',
    styleUrls: ['./delivery-policy.component.css']
})
export class DeliveryPolicy {
}
