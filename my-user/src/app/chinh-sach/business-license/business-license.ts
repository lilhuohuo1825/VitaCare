import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-business-license',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './business-license.html',
    styleUrls: ['./business-license.component.css']
})
export class BusinessLicense {
}
