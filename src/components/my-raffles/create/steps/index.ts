import { BasicInfoStep } from './basic-info-step';
import { ReviewStep } from './review-step';
import { TicketsStep } from './tickets-step';

export const STEPS = [
	{
		title: 'Lets add Basics',
		component: BasicInfoStep,
	},
	{
		title: 'Active time period & Entries',
		component: TicketsStep,
	},
	{
		title: 'Review',
		component: ReviewStep,
	},
];
