import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-return-policy',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './return-policy.html',
    styleUrls: ['./return-policy.component.css']
})
export class ReturnPolicy {
}
