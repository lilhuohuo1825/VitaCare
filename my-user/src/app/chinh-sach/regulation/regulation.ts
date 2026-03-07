import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-regulation',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './regulation.html',
    styleUrls: ['./regulation.component.css']
})
export class Regulation {
}
