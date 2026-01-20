import { BasicInfoStep } from './basic-info-step';
import { ReviewStep } from './review-step';
import { TicketsStep } from './tickets-step';

export const STEPS = [
	{
		title: 'Basic Information',
		component: BasicInfoStep,
	},
	{
		title: 'Active time period & Tickets',
		component: TicketsStep,
	},
	{
		title: 'Review',
		component: ReviewStep,
	},
];
