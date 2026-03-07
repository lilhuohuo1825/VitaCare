import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-content-policy',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './content-policy.html',
    styleUrls: ['./content-policy.component.css']
})
export class ContentPolicy {
}
