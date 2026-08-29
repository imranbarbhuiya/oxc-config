// @ts-nocheck

import type { SubmitFields } from './submitTask';
import { TaskIntroCard } from './TaskIntroCard';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { type FormProps } from './submission';
import { Platform } from 'react-native';
import { alertErrors } from './submission';
import type { Theme } from '@/utils/theme';
import { COLLEGE_META } from './taskMeta';
import { Footer } from './CollegeTaskFooter';
import path from 'node:path';
import { XP_IDS } from '@/utils/xpTaskIds';
import type { ParentType } from '../types';
import { parentHelper } from '../helpers';

export function run(props: FormProps, theme: Theme, fields: SubmitFields, extra: ParentType) {
	return [path, Platform, z, Input, XP_IDS, Footer, alertErrors, TaskIntroCard, COLLEGE_META, parentHelper, props, theme, fields, extra];
}
